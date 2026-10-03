# Как помочь проекту

Спасибо, что хотите улучшить Veil! Коротко о том, как устроена работа.

## Главное правило

Veil — карта, которая не собирает данные о людях. [PRIVACY.md](PRIVACY.md) — это контракт:
изменение, которое его нарушает, не будет принято, даже если оно удобное. Если сомневаетесь —
откройте issue и спросите до того, как писать код.

## Подготовка

Нужны Node 22+, pnpm 10 и [`pmtiles`](https://github.com/protomaps/go-pmtiles)
(`brew install pmtiles`).

```bash
pnpm install
scripts/build-regions.sh --out public/dev --maxzoom 5 world
scripts/build-regions.sh --out public/dev moscow-center
pnpm dev
```

## Перед pull request

```bash
pnpm check && pnpm lint && pnpm test && pnpm test:e2e && pnpm budget
```

- Код, комментарии и сообщения коммитов — на английском,
  в стиле [Conventional Commits](https://www.conventionalcommits.org/).
- Строки интерфейса — через `src/lib/i18n` на русском и английском.
- В компонентах нет литеральных цветов, радиусов и теней — только токены темы.
- Каждую новую зависимость объясните одной строкой в описании PR. Зависимости, которые сами
  ходят в сеть (аналитика, загрузчики шрифтов, CDN), не принимаются.
- Если изменение касается сети — дополните `tests/e2e/privacy.spec.ts`.

## Версии и релизы

Версии следуют [SemVer](https://semver.org/lang/ru/); всё до 1.0.0 — бета. Номер версии
хранится только в `package.json`, приложение показывает его в настройках.

Изменения копятся в разделе `[Unreleased]` файла [CHANGELOG.md](CHANGELOG.md). Чтобы выпустить
релиз:

1. Поднимите `version` в `package.json`, перенесите `[Unreleased]` в раздел новой версии с датой.
2. После слияния PR поставьте тег `vX.Y.Z` на коммит в `main` и опубликуйте GitHub Release
   с текстом из CHANGELOG (для версий до 1.0.0 — с пометкой pre-release).

## Ошибки и идеи

Ошибки и предложения — в [issues](../../issues). Уязвимости и утечки данных — закрыто,
по инструкции в [SECURITY.md](SECURITY.md).
