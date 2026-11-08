# Solana

Учебные задания по разработке на Solana. Каждая неделя лежит в своей папке.

## Неделя 8: Anchor vault (`week8/vault-dev`)

Проект: Simple Vault на Anchor 0.31.1. Основа взята из `0xnurda/vault-dev`, ветка `students-vault-card`.

### Что сделано

- `created_at`: в `UserCard` добавлено поле с временем создания (`Clock::get()?.unix_timestamp`).
- `close_user_card`: закрывает карточку, рента возвращается владельцу.
- `paused`: флаг в `VaultState`. Админ меняет его через `set_paused`, при паузе `create_user_card` падает с ошибкой `VaultPaused`.

### Проверка

- Тесты: `yarn test` на devnet, 6 passing.
- Program ID (devnet): `GUCvUxSVPPYudrxDT3RLf3ESEwmiFDJ273iwqoNm1YV2`

### Отчёт

Сначала скачала проект и поставила зависимости, потом по очереди добавила три изменения в `lib.rs` и тесты на них. Дальше `anchor keys sync`, `anchor build`, деплой на devnet и `yarn test`. Ключи и seed-фразы в репозиторий не попадают: они исключены через `.gitignore`.

## Неделя 9: deposit и share-токены (`week9/vault-dev`)

Проект: Simple Vault на Anchor 0.31.1, состояние репозитория `0xnurda/vault-dev` на коммите «add deposit and share tokens (week 9)».

### Что сделано

- Комиссия 1% на депозит: `fee` уходит на токен-аккаунт `fee_wallet` (адрес записывается в `VaultState` при создании vault, это админ), shares считаются от суммы после комиссии.
- Минимальный депозит: 1 токен (`MIN_DEPOSIT = 1_000_000`), иначе ошибка `DepositTooSmall`.
- Флаг `paused` в `VaultState` и инструкция `set_paused` (только админ). При паузе `deposit` падает с `VaultPaused`.
- Тесты: проверка комиссии, минимума, паузы и тест на троих пользователей (доля в shares равна доле во внесённых токенах).

### Проверка

- `yarn test` на devnet: 12 passing.
- Program ID (devnet): `BhxUdfF9JmC47eDzH2VFMC7U78mDrW99hGYKEPWffT1T`

### Отчёт

Скачала проект учителя на коммите 9 недели, сделала задания по очереди и после каждого собирала `anchor build`. Было две проблемы: при деплое новая программа не помещалась в выделенное место, и я расширила её командой `solana program extend`. Ещё я случайно добавила аккаунт комиссии не в ту структуру, это показали тесты, и я перенесла его в `Deposit`. Ключи и seed-фразы в репозиторий не попадают.