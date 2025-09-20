# UNJOB Express API Server

A comprehensive freelancing platform API built with Node.js, Express, and MongoDB. This server provides backend services for connecting freelancers with companies, managing projects, handling payments, and facilitating real-time communication.

## 🚀 Features

### Core Features

- **User Management** - Registration, authentication, profile management
- **Role-based Access** - Freelancers, Companies, and Admin roles
- **Gig Management** - Create, browse, and apply for gigs
- **Project Management** - Track project progress and deliverables
- **Real-time Messaging** - Chat between freelancers and companies
- **Payment System** - Integrated with Razorpay for secure transactions
- **File Management** - Cloudinary integration for file uploads
- **Subscription System** - Premium features and plans
- **Notification System** - Email and in-app notifications
- **Admin Dashboard** - Complete admin management interface

### Advanced Features

- **Google OAuth Integration** - Social login
- **Email Notifications** - Automated emails via Brevo/Resend
- **Redis Caching** - Optional performance optimization
- **Rate Limiting** - API protection and abuse prevention
- **Socket.IO Integration** - Real-time communication
- **Google Sheets Integration** - Data synchronization
- **Multi-category Support** - 100+ service categories

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v18 or higher)
- **MongoDB** (v5.0 or higher)
- **Redis** (optional, for caching)
- **Cloudinary Account** (for file uploads)
- **Razorpay Account** (for payments)
- **Google Cloud Console Project** (for OAuth)
- **Brevo/Resend Account** (for emails)

## 🛠 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd unjob-express-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
NODE_ENV=development
PORT=3001
BASE_URL=http://localhost:3001

# Client URLs
CLIENT_URL=http://localhost:3000
ADMIN_URL=http://localhost:3001

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
MONGODB_URI=mongodb://localhost:27017/unjobai

# =============================================================================
# AUTHENTICATION & SECURITY
# =============================================================================
JWT_SECRET=your-super-secret-jwt-key-make-this-very-long-and-secure
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# =============================================================================
# CLOUDINARY CONFIGURATION (File Upload)
# =============================================================================
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# =============================================================================
# PAYMENT GATEWAY (RAZORPAY)
# =============================================================================
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# =============================================================================
# GOOGLE OAUTH CONFIGURATION
# =============================================================================
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# =============================================================================
# EMAIL CONFIGURATION
# =============================================================================
FROM_EMAIL=your-email@example.com
BREVO_API_KEY=your_brevo_api_key
RESEND_API_KEY=your_resend_api_key

# =============================================================================
# REDIS CONFIGURATION (Optional - for caching)
# =============================================================================
REDIS_URL=redis://localhost:6379

# =============================================================================
# GOOGLE SHEETS INTEGRATION (Optional)
# =============================================================================
GOOGLE_SHEET_ID=your_google_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"

# =============================================================================
# SOCKET.IO CONFIGURATION
# =============================================================================
SOCKET_URL=http://localhost:3002

# =============================================================================
# PLATFORM CONFIGURATION
# =============================================================================
# Commission rates (in percentage)
PLATFORM_COMMISSION_FREELANCER=10
PLATFORM_COMMISSION_COMPANY=5

# Minimum withdrawal amount
MIN_WITHDRAWAL_AMOUNT=1000

# =============================================================================
# RATE LIMITING CONFIGURATION
# =============================================================================
RATE_LIMIT_WHITELIST=127.0.0.1,::1

# =============================================================================
# FEATURE FLAGS
# =============================================================================
ENABLE_REAL_TIME_CHAT=true
ENABLE_VIDEO_CALLS=true
ENABLE_FILE_SHARING=true
ENABLE_PUSH_NOTIFICATIONS=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_PAYMENT_GATEWAY=true
```

### 4. Database Setup

```bash
# Start MongoDB service
sudo systemctl start mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 5. Redis Setup (Optional)

```bash
# Start Redis service
sudo systemctl start redis

# Or using Docker
docker run -d -p 6379:6379 --name redis redis:latest
```

## 🏃‍♂️ Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

### With PM2 (Recommended for Production)

```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

## 📁 Project Structure

```
unjob-express-api/
├── api/                          # API route handlers
│   ├── auth/                    # Authentication endpoints
│   ├── profile/                 # User profile management
│   ├── posts/                   # Gig posts management
│   ├── gigs/                    # Gig operations
│   ├── applications/            # Gig applications
│   ├── projects/                # Project management
│   ├── messages/                # Messaging system
│   ├── payments/                # Payment processing
│   ├── subscription/            # Subscription management
│   ├── notifications/           # Notification system
│   └── admin/                   # Admin panel endpoints
├── models/                      # Database models
│   ├── User.js                  # User schema
│   ├── Post.js                  # Gig post schema
│   ├── Application.js           # Application schema
│   ├── Project.js               # Project schema
│   ├── Message.js               # Message schema
│   ├── Payment.js               # Payment schema
│   ├── Notification.js          # Notification schema
│   └── SupportTicket.js         # Support ticket schema
├── lib/                         # Utility libraries
│   ├── mongodb.js               # Database connection
│   ├── auth.js                  # Authentication logic
│   ├── cloudinary.js            # File upload config
│   └── emailTemplates.js        # Email templates
├── middleware/                  # Custom middleware
├── utils/                       # Helper functions
├── data/                        # Data exports/imports
├── .env                         # Environment variables
├── package.json                 # Dependencies
└── README.md                    # This file
```

## 🔧 Configuration Guide

### Database Models

The application uses the following main models:

#### User Model

- **Freelancers**: Skills, portfolio, ratings, earnings
- **Companies**: Company details, verification, projects
- **Admins**: Platform management access

#### Gig/Post Model

- Categories and subcategories
- Pricing tiers
- Requirements and deliverables
- Application tracking

#### Project Model

- File submissions
- Status tracking
- Payment milestones
- Company feedback

### Service Categories

The platform supports 100+ service categories including:

- **Design & Creative**: Logo design, UI/UX, illustrations
- **Tech & Development**: Full-stack, mobile apps, testing
- **Digital Marketing**: SEO, social media, ads management
- **AI & Automation**: ChatGPT integration, automation workflows
- **Writing & Translation**: Content creation, translations
- **Business & Legal**: Accounting, legal services, consulting

## 🔐 Authentication Flow

1. **Registration**: Email/password or Google OAuth
2. **Email Verification**: Automated email verification
3. **Role Selection**: Choose between freelancer/company
4. **Profile Completion**: Role-specific profile setup
5. **JWT Tokens**: Secure session management

## 💳 Payment Integration

### Razorpay Setup

1. Create Razorpay account
2. Get API keys from dashboard
3. Configure webhook endpoints
4. Set commission rates in environment

### Supported Features

- **Escrow System**: Secure payment holding
- **Commission Deduction**: Automatic platform fees
- **Payout Management**: Freelancer withdrawals
- **Payment Tracking**: Complete transaction history

## 📧 Email System

### Brevo Integration

- **Transactional Emails**: Order confirmations, notifications
- **Marketing Campaigns**: User engagement
- **Template Management**: Branded email designs

### Supported Email Types

- Welcome emails
- Password reset
- Payment confirmations
- Project updates
- Subscription notifications

## 🔄 Real-time Features

### Socket.IO Integration

- **Live Chat**: Real-time messaging
- **Notifications**: Instant updates
- **Typing Indicators**: Enhanced UX
- **Online Status**: User presence

## 📊 Admin Features

### Dashboard Analytics

- User registration metrics
- Revenue tracking
- Platform usage statistics
- Support ticket management

### Management Tools

- User verification
- Content moderation
- Payment dispute resolution
- System configuration

## 🛡 Security Features

### Implemented Security

- **JWT Authentication**: Secure API access
- **Rate Limiting**: DDoS protection
- **Input Validation**: XSS prevention
- **CORS Configuration**: Cross-origin security
- **Password Hashing**: bcrypt encryption
- **File Upload Security**: Type and size validation

## 🚀 API Endpoints

### Authentication

```
POST /api/auth/register          # User registration
POST /api/auth/login            # User login
POST /api/auth/forgot-password  # Password reset
POST /api/auth/update-role      # Role selection
```

### User Management

```
GET    /api/profile/[userId]     # Get user profile
PATCH  /api/profile/[userId]     # Update profile
POST   /api/profile/follow       # Follow user
```

### Gigs & Applications

```
GET    /api/posts               # Browse gigs
POST   /api/posts               # Create gig
POST   /api/applications/create # Apply to gig
GET    /api/gigs/[id]          # Get gig details
```

### Projects

```
POST   /api/projects/submit     # Submit project
PATCH  /api/projects/[id]/status # Update status
```

### Payments

```
POST   /api/payments/create     # Create payment
GET    /api/payments/history    # Payment history
POST   /api/payments/withdraw   # Request withdrawal
```

### Messaging

```
GET    /api/messages            # Get conversations
POST   /api/messages/send       # Send message
POST   /api/messages/upload     # Upload file
```

## 🧪 Testing

### Run Tests

```bash
npm test
```

### API Testing

Use tools like Postman or Insomnia to test endpoints:

1. Import the API collection
2. Set environment variables
3. Test authentication flow
4. Validate CRUD operations

## 📈 Performance Optimization

### Recommended Optimizations

- **Redis Caching**: Cache frequent queries
- **Database Indexing**: Optimize search queries
- **CDN Integration**: Serve static assets
- **Load Balancing**: Handle high traffic
- **Rate Limiting**: Prevent abuse

### Monitoring

- **Logs**: Use Winston for logging
- **Performance**: Monitor API response times
- **Errors**: Implement error tracking
- **Metrics**: Track business KPIs

## 🔧 Troubleshooting

### Common Issues

#### Database Connection

```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod
```

#### Port Conflicts

```bash
# Check port usage
lsof -i :3001

# Kill process
kill -9 <PID>
```

#### Environment Variables

```bash
# Verify .env file
cat .env | grep -v '^#'

# Check variable loading
node -e "console.log(process.env.MONGODB_URI)"
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Technical Support

- **Email**: support@unjob.com
- **Documentation**: Check API docs
- **Issues**: Create GitHub issue

### Business Inquiries

- **Email**: business@unjob.com
- **Website**: https://unjob.com

## 🔮 Roadmap

### Upcoming Features

- [ ] Video calling integration
- [ ] Advanced analytics dashboard
- [ ] Mobile app API
- [ ] Multi-language support
- [ ] Blockchain payments
- [ ] AI-powered matching

### Version History

- **v1.0.0**: Initial release
- **v1.1.0**: Payment system integration
- **v1.2.0**: Real-time messaging
- **v1.3.0**: Admin dashboard

---

**Built with ❤️ by the UNJOB Team**

For more information, visit our [website](https://unjob.com) or check our [documentation](https://docs.unjob.com).
