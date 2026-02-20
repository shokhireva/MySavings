# MySavings (Tauri + React + TypeScript)

This template should help get you started developing with Tauri, React and TypeScript in Vite.

## Локальная разработка

```bash
npm install
npm run dev
```

## Сборка веб-версии

```bash
npm run build
```

Результат — папка `dist` с готовым сайтом.

## Публикация на GitHub Pages (бесплатно)

### 1. Создайте репозиторий на GitHub

- Зайдите на [github.com](https://github.com) → New repository
- Имя репозитория (например, `MySavings`) — это будет URL: `https://ВАШ_ЛОГИН.github.io/MySavings/`

### 2. Включите GitHub Pages

- Репозиторий → **Settings** → **Pages**
- В **Source** выберите: **GitHub Actions**

### 3. Загрузите код

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/MySavings.git
git push -u origin main
```

### 4. Готово

При каждом `git push` в ветку `main` GitHub Actions соберёт проект и опубликует его. Сайт будет доступен по адресу:

`https://ВАШ_ЛОГИН.github.io/ИМЯ_РЕПОЗИТОРИЯ/`

---

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
