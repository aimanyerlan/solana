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

---

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

---

## Неделя 10: withdraw и CPI (`week10/vault-dev`)

Проект: Simple Vault на Anchor 0.31.1, состояние репозитория `0xnurda/vault-dev` на коммите «add withdraw (week 10)».

### Что сделано

- `withdraw_all`: выводит все shares пользователя за один вызов. Берёт баланс share-аккаунта и вызывает обычный `withdraw`.
- Закрытие карточки: если после вывода у пользователя не осталось shares, `user_card` закрывается и рента возвращается ему. Проверка идёт по реальному балансу share-аккаунта.
- Тесты: карточка закрывается после полного вывода, `withdraw_all` возвращает токены и обнуляет shares, повторный вызов без карточки падает.

### Проверка

- `yarn test` на devnet: 15 passing.
- Program ID (devnet): `UMAZhQ8fgnb1Jgr8Mcr5ohy6fo2mng96pT8Ya87YXJA`

### Отчёт

Скачала проект учителя на коммите 10 недели и сделала два задания поверх него. `withdraw_all` оказался простым: он переиспользует `withdraw` и ту же структуру аккаунтов. Для закрытия карточки пришлось сделать `reload()` share-аккаунта после сжигания, иначе баланс остался бы старым. Ключи и seed-фразы в репозиторий не попадают.

---

## Неделя 11: свои токены и CLMM-пул на Raydium (`week11/vault-dev`)

Проект: состояние репозитория `0xnurda/vault-dev` на коммите «add token and Raydium CLMM pool creation script (week 11)». Контракт на этой неделе не менялся, добавился скрипт `scripts/create-clmm-pool.ts`.

### Что сделано

- Запустила `yarn create-pool`: скрипт создал два тестовых токена и CLMM-пул на Raydium devnet.
- TOKEN_A: `7KxTFgMb3ZStHAy6xjMWZ5m3FiL1a63QSWFDCW1r9gph`
- TOKEN_B: `3SBhfoCUWbMsn6siGpKuXw9eTCbYzPU4Qp6YpYyjQ3G2`
- Конфиг комиссий: tickSpacing 60, комиссия 0.25%, стартовая цена 1.

### Проверка

- Pool ID: `3Rc8yBxJN8ks5Fij4W7fzHFWi2bt3kRZyetGq8hYYSiH`
- Пул в Explorer: https://explorer.solana.com/address/3Rc8yBxJN8ks5Fij4W7fzHFWi2bt3kRZyetGq8hYYSiH?cluster=devnet
- Транзакция создания: https://explorer.solana.com/tx/44x7sKYoWriwU7DEfXZcU8E4ziEcSMoLoCZ6Dyy2aTvZLRTMdB4heS2KPx3ZPp4UV532fCmTLU8k54gZWsVFz4BG?cluster=devnet
- Владелец аккаунта пула: программа Raydium CLMM `DRayAUgENGQBKVaX8owNhgzkEDyoHTGVEGHVJT1E9pfH`.

### Отчёт

Скачала проект учителя на последнем коммите, поставила зависимости и запустила скрипт. Узнала, что такое CLMM: ликвидность работает только в выбранном ценовом диапазоне, поэтому комиссий там больше.