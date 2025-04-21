Sure!  
Here’s **everything combined into one single `README.md` file**, ready for you to just save:

---

# Vaultify

Vaultify is a secure document management system that allows users to upload, store, search, and manage their important files in the cloud.

---

## 📋 Features

- 🔒 **Secure Authentication**: User authentication system to keep your documents secure.
- 📁 **Document Storage**: Upload and store your files securely on Backblaze B2 cloud storage.
- 🔍 **Document Search**: Search files by name, description, or tags.
- 📱 **Document Management**: Easily upload, download, view, and delete your documents.
- 📄 **Custom Naming**: Upload files with custom display names.
- 🏷️ **Tagging System**: Add tags to your documents for better organization and search.

---

## 🚀 Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **Storage**: Backblaze B2 Cloud Storage
- **Logging**: Winston
- **Authentication**: Custom token-based system

---

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/anuj-rishu/Vaultify
cd vaultify
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Create a `.env` file inside the `server` directory and add the following:

```env
PORT=5000
MONGO_URI=your_mongo_db_connection_string
JWT_SECRET=your_secret_key
B2_APPLICATION_KEY_ID=your_backblaze_key_id
B2_APPLICATION_KEY=your_backblaze_application_key
B2_BUCKET_ID=your_backblaze_bucket_id
```

### 4. Start the server

```bash
npm start
```

---

## 🐳 Docker Deployment

You can also run Vaultify using Docker:

```bash
docker build -t vaultify .
docker run -p 5000:5000 --env-file server/.env vaultify
```

---

## 📝 API Endpoints

### Authentication

- `POST /auth/login` — Login with username and password.
- `DELETE /auth/logout` — Logout user.

### Documents

- `GET /documents` — Get all documents for the authenticated user.
- `GET /documents/:id` — Get a specific document by ID.
- `GET /documents/search/:filename` — Search for documents by filename.
- `GET /documents/search?query=searchterm` — Search documents across name, description, and tags.
- `POST /documents/upload` — Upload a new document.
- `DELETE /documents/:id` — Delete a document.

---

## 📄 Usage Examples

### Uploading a Document

Using Postman or a similar tool:

1. Make a `POST` request to `/documents/upload`.
2. Set the `Authorization` header:
   ```
   x-csrf-token  your_x-csrf-token
   ```
3. Use `form-data` with the following fields:
   - `file`: Your file
   - `description`: Document description
   - `tags`: Comma-separated tags (e.g., `work,personal,important`)
   - `customName` (optional): Custom display name

---

### Searching Documents by Filename

Send a `GET` request to:

```bash
/documents/search/:filename
```

or search across name, description, and tags:

```bash
/documents/search?query=your_search_term
```

---

## 🔒 Security Features

- Token-based authentication.
- Rate limiting to prevent brute-force attacks.
- Secure file storage in Backblaze B2.

---

## 📜 License

This project is licensed under the **Apache License 2.0**.  
See the [LICENSE](LICENSE) file for details.

---

## 📞 Contact

For questions or support, please open an issue on the [GitHub repository](https://github.com/anuj-rishu/Vaultify).

---

# ✨ Thank You For Using Vaultify!
