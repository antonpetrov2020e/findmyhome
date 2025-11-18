# Настройка Google Docs API

Для работы с Google Docs API нужно создать Service Account и получить credentials.

## Шаги настройки

### 1. Создание проекта в Google Cloud Console

1. Перейдите на https://console.cloud.google.com/
2. Создайте новый проект или выберите существующий
3. Назовите проект, например "FindMyHome Bot"

### 2. Включение Google Docs API

1. В меню слева выберите "APIs & Services" → "Library"
2. Найдите "Google Docs API"
3. Нажмите "Enable"

### 3. Создание Service Account

1. Перейдите в "APIs & Services" → "Credentials"
2. Нажмите "Create Credentials" → "Service Account"
3. Заполните:
   - **Service account name**: `findmyhome-bot`
   - **Service account description**: `Bot for accessing Google Docs`
4. Нажмите "Create and Continue"
5. Пропустите опциональные шаги (Grant access, Grant users access)
6. Нажмите "Done"

### 4. Создание ключа (credentials)

1. Найдите созданный Service Account в списке
2. Нажмите на него
3. Перейдите на вкладку "Keys"
4. Нажмите "Add Key" → "Create new key"
5. Выберите формат **JSON**
6. Нажмите "Create"
7. Файл JSON автоматически скачается

### 5. Сохранение credentials

1. Переименуйте скаченный файл в `google-credentials.json`
2. Поместите его в корень проекта (рядом с `package.json`)
3. **ВАЖНО**: Файл уже добавлен в `.gitignore`, не коммитьте его!

### 6. Предоставление доступа к Google Документу

1. Откройте скаченный JSON файл
2. Найдите поле `client_email`, скопируйте email (будет выглядеть как `name@project.iam.gserviceaccount.com`)
3. Откройте ваш Google Документ
4. Нажмите "Share" / "Поделиться"
5. Вставьте скопированный email
6. Выберите права **"Viewer"** / **"Читатель"** (бот только читает документ)
7. Снимите галочку "Notify people" (не нужно отправлять уведомление)
8. Нажмите "Share" / "Готово"

### 7. Получение Document ID

Document ID находится в URL вашего Google Документа:

```
https://docs.google.com/document/d/DOCUMENT_ID_HERE/edit
                                  ^^^^^^^^^^^^^^^^^
                                  Это ваш Document ID
```

Скопируйте эту часть и используйте в `.env` файле.

## Пример содержимого google-credentials.json

```json
{
  "type": "service_account",
  "project_id": "your-project-123456",
  "private_key_id": "abcd1234...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "findmyhome-bot@your-project-123456.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

## Проверка настройки

После настройки запустите бот и используйте команду `/stats` в Telegram. Если всё настроено правильно, вы увидите статистику по документу.

## Возможные проблемы

### Ошибка доступа к документу

```
Error: The caller does not have permission
```

**Решение**: Убедитесь, что вы предоставили доступ Service Account email к документу (шаг 6).

### Неверный Document ID

```
Error: Requested entity was not found
```

**Решение**: Проверьте правильность Document ID в `.env` файле.

### Файл credentials не найден

```
Error: ENOENT: no such file or directory
```

**Решение**: Убедитесь, что `google-credentials.json` находится в корне проекта.
