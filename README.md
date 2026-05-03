# Full-Stack App with Vercel + GitHub + Supabase + Resend + Ollama

This is a modern full-stack application integrating multiple services with comprehensive security measures.

## 🚀 Stack

- **Frontend**: Next.js 14 with TypeScript & Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Email**: Resend
- **AI**: Ollama (Local LLM)
- **Deployment**: Vercel
- **Version Control**: GitHub
- **Security**: Custom Security Broker with rate limiting, CSRF protection, and input sanitization

## 📋 Prerequisites

- Node.js 18+
- Ollama installed locally
- Supabase account
- Resend account
- Vercel account
- GitHub account

## 🛠️ Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd fullstack-app
npm install
```

### 2. Environment Variables

Copy `env.example` to `.env.local` and configure:

```bash
cp env.example .env.local
```

Configure the following variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `RESEND_API_KEY`: Your Resend API key
- `NEXT_PUBLIC_APP_URL`: Your application URL
- `OLLAMA_HOST`: Ollama server URL (default: http://localhost:11434)

### 3. Ollama Setup

```bash
# Pull a model (e.g., Llama 3.2)
ollama pull llama3.2

# Start Ollama server
ollama serve
```

### 4. Database Setup

Create the following tables in your Supabase project:

```sql
-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🔧 Security Features

- **Rate Limiting**: 100 requests per minute per IP
- **CSRF Protection**: Origin validation for API routes
- **Input Sanitization**: XSS prevention
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **Email Validation**: Proper email format checking
- **Password Hashing**: SHA-256 encryption

## 📦 Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

Set these in your Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL`

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Type checking
npm run type-check
```

## 📁 Project Structure

```
src/
├── app/                 # Next.js app router
├── lib/                 # Utility libraries
│   ├── security.ts      # Security broker
│   ├── supabase.ts      # Supabase client
│   └── resend.ts        # Email service
├── middleware.ts        # Next.js middleware
└── types/              # TypeScript types
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
