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