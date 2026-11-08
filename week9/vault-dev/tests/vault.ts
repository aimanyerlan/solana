/**
 * Тесты для Simple Vault на devnet
 *
 * Сценарий:
 *   1. Admin создаёт vault (initialize_vault)
 *   2. Пользователи A и B создают свои карточки (create_user_card)
 *   3. Повторное создание карточки A падает
 *   4. A вносит 100 токенов → 100 shares, B вносит 50 → 50 shares
 *   5. Депозит без карточки и депозит 0 — ошибки
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { createMint, createAccount, mintTo, getAccount } from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { assert } from "chai";
import { SimpleVault } from "../target/types/simple_vault";

// Переводим SOL от admin → pubkey (обходит rate limit devnet airdrop)
async function fundFromAdmin(
  provider: anchor.AnchorProvider,
  admin: Keypair,
  pubkey: PublicKey,
  lamports = 0.05 * LAMPORTS_PER_SOL
) {
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: admin.publicKey, toPubkey: pubkey, lamports })
  );
  await provider.sendAndConfirm(tx, [admin]);
}

describe("simple_vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SimpleVault as Program<SimpleVault>;
  const admin = (provider.wallet as anchor.Wallet).payer;
  const userA = Keypair.generate();
  const userB = Keypair.generate();

  let tokenMint: PublicKey;
  let vaultStatePDA: PublicKey;
  let vaultTokenAccountPDA: PublicKey;
  let shareMintPDA: PublicKey;
  let feeTokenAccount: PublicKey; 

  // Токен-аккаунты (токен vault) и share-аккаунты пользователей
  const userC = Keypair.generate(); // без карточки
  const tokenAcc: Record<string, PublicKey> = {};
  const shareAcc: Record<string, PublicKey> = {};
  const UNIT = 1_000_000; // decimals = 6
  const afterFee = (amount: number) => amount - Math.floor(amount / 100);

  const deposit = (user: Keypair, amount: number) =>
    program.methods
      .deposit(new anchor.BN(amount))
      .accounts({
        vaultState: vaultStatePDA,
        userCard: cardPda(user.publicKey),
        vaultTokenAccount: vaultTokenAccountPDA,
        shareMint: shareMintPDA,
        userTokenAccount: tokenAcc[user.publicKey.toBase58()],
        userShareAccount: shareAcc[user.publicKey.toBase58()],
        feeTokenAccount,
        user: user.publicKey,
      } as any)
      .signers([user])
      .rpc();

  const cardPda = (user: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("user_card"), vaultStatePDA.toBuffer(), user.toBuffer()],
      program.programId
    )[0];

  before(async () => {
    await fundFromAdmin(provider, admin, userA.publicKey);
    await fundFromAdmin(provider, admin, userB.publicKey);
    await fundFromAdmin(provider, admin, userC.publicKey);

    tokenMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);

    [vaultStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), tokenMint.toBuffer()],
      program.programId
    );
    [vaultTokenAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_tokens"), tokenMint.toBuffer()],
      program.programId
    );
    [shareMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("share_mint"), tokenMint.toBuffer()],
      program.programId
    );
  });

  it("initialize_vault: vault создан", async () => {
    await program.methods
      .initializeVault()
      .accounts({
        vaultState: vaultStatePDA,
        vaultTokenAccount: vaultTokenAccountPDA,
        shareMint: shareMintPDA,
        tokenMint,
        admin: admin.publicKey,
      } as any)
      .rpc();

    const vault = await program.account.vaultState.fetch(vaultStatePDA);
    assert.equal(vault.admin.toBase58(), admin.publicKey.toBase58());
    assert.equal(vault.tokenMint.toBase58(), tokenMint.toBase58());
    assert.equal(vault.shareMint.toBase58(), shareMintPDA.toBase58());
  });

  it("create_user_card: у каждого пользователя своя карточка", async () => {
    for (const user of [userA, userB]) {
      const userCard = cardPda(user.publicKey);
      await program.methods
        .createUserCard()
        .accounts({ vaultState: vaultStatePDA, userCard, user: user.publicKey } as any)
        .signers([user])
        .rpc();

      const card = await program.account.userCard.fetch(userCard);
      assert.equal(card.owner.toBase58(), user.publicKey.toBase58());
      assert.equal(card.vault.toBase58(), vaultStatePDA.toBase58());
    }
    assert.notEqual(cardPda(userA.publicKey).toBase58(), cardPda(userB.publicKey).toBase58());
  });

  it("create_user_card: вторая карточка для того же пользователя — ошибка", async () => {
    let failed = false;
    try {
      await program.methods
        .createUserCard()
        .accounts({
          vaultState: vaultStatePDA,
          userCard: cardPda(userA.publicKey),
          user: userA.publicKey,
        } as any)
        .signers([userA])
        .rpc();
    } catch {
      failed = true;
    }
    assert.isTrue(failed, "повторная карточка должна быть отклонена");
  });

  it("deposit: A вносит 100 токенов → получает 100 shares", async () => {
    // Токен-аккаунты пользователей и стартовые токены
    for (const user of [userA, userB, userC]) {
      const key = user.publicKey.toBase58();
      tokenAcc[key] = await createAccount(provider.connection, admin, tokenMint, user.publicKey);
      shareAcc[key] = await createAccount(provider.connection, admin, shareMintPDA, user.publicKey);
      await mintTo(provider.connection, admin, tokenMint, tokenAcc[key], admin, 1000 * UNIT);
    }

    feeTokenAccount = await createAccount(provider.connection, admin, tokenMint, admin.publicKey);
    await deposit(userA, 100 * UNIT);

    const shares = await getAccount(provider.connection, shareAcc[userA.publicKey.toBase58()]);
    assert.equal(shares.amount, BigInt(afterFee(100 * UNIT)));

    const card = await program.account.userCard.fetch(cardPda(userA.publicKey));
    assert.equal(card.deposited.toNumber(), afterFee(100 * UNIT));
    assert.equal(card.shares.toNumber(), afterFee(100 * UNIT));

    const fee = await getAccount(provider.connection, feeTokenAccount);
    assert.equal(fee.amount, BigInt(1 * UNIT));
  });

  it("deposit: B вносит 50 токенов → получает 50 shares", async () => {
    await deposit(userB, 50 * UNIT);

    const shares = await getAccount(provider.connection, shareAcc[userB.publicKey.toBase58()]);
    assert.equal(shares.amount, BigInt(afterFee(50 * UNIT)));

    const total = afterFee(100 * UNIT) + afterFee(50 * UNIT);
    const vault = await program.account.vaultState.fetch(vaultStatePDA);
    assert.equal(vault.totalTokens.toNumber(), total);
    assert.equal(vault.totalShares.toNumber(), total);

    const vaultTokens = await getAccount(provider.connection, vaultTokenAccountPDA);
    assert.equal(vaultTokens.amount, BigInt(total));
  });

  it("deposit: без карточки — ошибка", async () => {
    let failed = false;
    try {
      await deposit(userC, 10 * UNIT);
    } catch {
      failed = true;
    }
    assert.isTrue(failed, "депозит без карточки должен быть отклонён");
  });

  it("deposit: сумма 0 — ошибка", async () => {
    let failed = false;
    try {
      await deposit(userA, 0);
    } catch {
      failed = true;
    }
    assert.isTrue(failed, "нулевой депозит должен быть отклонён");
  });

  it("deposit: меньше минимума (1 токен) — ошибка", async () => {
    let errMsg = "";
    try {
      await deposit(userA, UNIT - 1);
    } catch (e: any) {
      errMsg = String(e);
    }
    assert.include(errMsg, "DepositTooSmall");
  });

  it("deposit: ровно минимум (1 токен) проходит", async () => {
    await deposit(userA, UNIT);
  });

  it("deposit: трое пользователей — доли по shares считаются верно", async () => {
    // userC ещё без карточки: создаём и вносим 30 токенов
    await program.methods
      .createUserCard()
      .accounts({
        vaultState: vaultStatePDA,
        userCard: cardPda(userC.publicKey),
        user: userC.publicKey,
      } as any)
      .signers([userC])
      .rpc();
    await deposit(userC, 30 * UNIT);

    const vault = await program.account.vaultState.fetch(vaultStatePDA);
    const totalTokens = BigInt(vault.totalTokens.toString());
    const totalShares = BigInt(vault.totalShares.toString());

    let sumShares = BigInt(0);
    for (const user of [userA, userB, userC]) {
      const card = await program.account.userCard.fetch(cardPda(user.publicKey));
      const shares = BigInt(card.shares.toString());
      const deposited = BigInt(card.deposited.toString());
      sumShares += shares;

      // баланс share-токенов совпадает с карточкой
      const acc = await getAccount(provider.connection, shareAcc[user.publicKey.toBase58()]);
      assert.equal(acc.amount, shares);

      // доля в shares = доля во внесённых токенах
      assert.equal(shares * totalTokens, deposited * totalShares);
    }
    // все shares принадлежат этим троим
    assert.equal(sumShares, totalShares);
  });

  it("set_paused: не админ не может менять паузу", async () => {
    let failed = false;
    try {
      await program.methods
        .setPaused(true)
        .accounts({ vaultState: vaultStatePDA, admin: userA.publicKey } as any)
        .signers([userA])
        .rpc();
    } catch {
      failed = true;
    }
    assert.isTrue(failed, "не админ не должен ставить паузу");
  });

  it("paused: при паузе депозит запрещён, после снятия паузы работает", async () => {
    await program.methods
      .setPaused(true)
      .accounts({ vaultState: vaultStatePDA, admin: admin.publicKey } as any)
      .rpc();
    assert.isTrue((await program.account.vaultState.fetch(vaultStatePDA)).paused);

    let errMsg = "";
    try {
      await deposit(userA, 5 * UNIT);
    } catch (e: any) {
      errMsg = String(e);
    }
    assert.include(errMsg, "VaultPaused");

    await program.methods
      .setPaused(false)
      .accounts({ vaultState: vaultStatePDA, admin: admin.publicKey } as any)
      .rpc();
    await deposit(userA, 5 * UNIT);
  });
});
