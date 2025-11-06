# Backend Development Requirements for Marketing Management Dashboard

## Project Overview
Create a comprehensive RESTful API backend for a bilingual (English/Arabic) marketing management dashboard with RTL/LTR support. The system manages client onboarding, campaign planning, service packages, quotations, contracts, and reporting.

---

## Technology Stack Requirements

### Recommended Stack:
- **Framework**: Node.js with Express.js OR Python with FastAPI/Django
- **Database**: PostgreSQL (preferred) or MongoDB
- **Authentication**: JWT-based authentication with refresh tokens
- **File Storage**: AWS S3 or local storage for documents/images
- **Email Service**: SendGrid, AWS SES, or similar
- **API Documentation**: Swagger/OpenAPI
- **Validation**: Joi (Node.js) or Pydantic (Python)
- **ORM**: Prisma/TypeORM (Node.js) or SQLAlchemy (Python)

---

## Core Data Models & Database Schema

### 1. User Model
```
Fields:
- id (UUID, primary key)
- email (string, unique, required, indexed)
- password (string, hashed with bcrypt, required)
- fullName (string)
- role (enum: 'admin', 'manager', 'employee')
- createdAt (timestamp)
- updatedAt (timestamp)
- lastLogin (timestamp)
- isActive (boolean, default: true)
- deletedAt (timestamp, nullable for soft delete)

Relations:
- One-to-Many: Clients (as creator)
- One-to-Many: CampaignPlans (as creator)
- One-to-Many: Quotations (as creator)
- One-to-Many: Contracts (as creator)
```

### 2. Client Model
```
Fields:
- id (UUID, primary key)
- createdBy (UUID, foreign key -> User)
- createdAt (timestamp)
- updatedAt (timestamp)
- deletedAt (timestamp, nullable)
- status (enum: 'active', 'inactive', 'pending', default: 'active')

// Personal Information (JSON or nested fields)
- personal_fullName (string)
- personal_email (string, validated)
- personal_phone (string, Egyptian mobile format: +201XXXXXXXXX or 01XXXXXXXXX)
- personal_position (string, optional)

// Business Information
- business_name (string, indexed)
- business_category (enum: 'retail', 'restaurant', 'healthcare', 'technology', 
                     'education', 'real-estate', 'automotive', 'beauty', 'finance', 'other')
- business_description (text)
- business_mainOfficeAddress (text)
- business_establishedYear (integer, optional)

// Contact Information
- contact_businessPhone (string, Egyptian mobile)
- contact_businessWhatsApp (string, Egyptian mobile)
- contact_businessEmail (string, validated)
- contact_website (string, URL format, optional)

Relations:
- Many-to-One: User (creator)
- One-to-Many: Branches
- One-to-Many: Segments
- One-to-Many: Competitors
- One-to-Many: SocialLinks
- One-to-One: SwotAnalysis
- One-to-Many: CampaignPlans
- One-to-Many: Quotations
- One-to-Many: Contracts
- One-to-Many: Reports
- One-to-Many: Services (client-specific)
```

### 3. Branch Model
```
Fields:
- id (UUID, primary key)
- clientId (UUID, foreign key -> Client, indexed)
- name (string, required)
- address (text)
- phone (string, optional)
- createdAt (timestamp)
- updatedAt (timestamp)

Relations:
- Many-to-One: Client
```

### 4. Segment (Target Audience) Model
```
Fields:
- id (UUID, primary key)
- clientId (UUID, foreign key -> Client, indexed)
- name (string, required)
- description (text)
- ageRange (string, e.g., "18-35")
- gender (enum: 'all', 'male', 'female', 'other')
- interests (text, comma-separated or JSON array)
- incomeLevel (enum: 'low', 'middle', 'high', 'varied')
- createdAt (timestamp)
- updatedAt (timestamp)

Relations:
- Many-to-One: Client
```

### 5. Competitor Model
```
Fields:
- id (UUID, primary key)
- clientId (UUID, foreign key -> Client, indexed)
- name (string, required)
- description (text)
- swot_strengths (JSON array of strings)
- swot_weaknesses (JSON array of strings)
- swot_opportunities (JSON array of strings)
- swot_threats (JSON array of strings)
- createdAt (timestamp)
- updatedAt (timestamp)

Relations:
- Many-to-One: Client
```

### 6. SocialLink Model
```
Fields:
- id (UUID, primary key)
- clientId (UUID, foreign key -> Client, indexed)
- platform (string, e.g., 'facebook', 'instagram', 'tiktok', 'linkedin', 'youtube', 'custom')
- platformName (string, for custom platforms)
- url (string, URL format, required)
- type (enum: 'business', 'personal')
- createdAt (timestamp)
- updatedAt (timestamp)

Relations:
- Many-to-One: Client
```

### 7. SwotAnalysis Model
```
Fields:
- id (UUID, primary key)
- clientId (UUID, foreign key -> Client, unique, indexed)
- strengths (JSON array of strings)
- weaknesses (JSON array of strings)
- opportunities (JSON array of strings)
- threats (JSON array of strings)
- createdAt (timestamp)
- updatedAt (timestamp)

Relations:
- One-to-One: Client
```

### 8. Service Model
```
Fields:
- id (UUID, primary key)
- en (string, English name, required)
- ar (string, Arabic name, required)
- description (text)
- category (enum: 'photography', 'web', 'reels', 'other')
- price (decimal(10,2), optional)
- discount (decimal(10,2), optional)
- discountType (enum: 'percentage', 'fixed', default: 'percentage')
- isGlobal (boolean, default: true)
- clientId (UUID, foreign key -> Client, nullable, only for client-specific services)
- createdAt (timestamp)
- updatedAt (timestamp)
- deletedAt (timestamp, nullable)

Relations:
- Many-to-One: Client (optional, for client-specific services)
- Many-to-Many: Packages (through PackageService)
- Many-to-Many: CampaignPlans (through CampaignService)

Constraints:
- Unique constraint on (en, clientId) - prevent duplicate service names per client
- If isGlobal=true, clientId must be null
```

### 9. Package Model
```
Fields:
- id (UUID, primary key)
- nameEn (string, English name, required)
- nameAr (string, Arabic name, required)
- price (decimal(10,2), required)
- discount (decimal(10,2), optional, default: 0)
- discountType (enum: 'percentage', 'fixed', default: 'percentage')
- features (JSON array): [
    {
        en: string,
        ar: string,
        quantity: string (optional)
    }
]
- isActive (boolean, default: true)
- createdAt (timestamp)
- updatedAt (timestamp)
- deletedAt (timestamp, nullable)

Relations:
- Many-to-Many: Services (through PackageService)
- One-to-Many: Contracts

Computed Fields:
- finalPrice (calculated): price - discount based on discountType
```

### 10. PackageService (Join Table)
```
Fields:
- id (UUID, primary key)
- packageId (UUID, foreign key -> Package)
- serviceId (UUID, foreign key -> Service)
- createdAt (timestamp)

Relations:
- Many-to-One: Package
- Many-to-One: Service
```

### 11. CampaignPlan Model
```
Fields:
- id (UUID, primary key)
- clientId (UUID, foreign key -> Client, indexed)
- planName (string)
- objectives (JSON array): [
    { id: string, en: string, ar: string }
]
- strategies (JSON array): [
    { id: string, en: string, ar: string }
]
- servicesPricing (JSON object): { serviceId: customPrice }
- budget (decimal(10,2))
- timeline (string)
- startDate (date, optional)
- duration (string, optional)
- finalStrategy (text, generated document)
- status (enum: 'draft', 'active', 'completed', 'cancelled', default: 'draft')
- createdBy (UUID, foreign key -> User, indexed)
- createdAt (timestamp)
- updatedAt (timestamp)
- deletedAt (timestamp, nullable)

Relations:
- Many-to-One: Client
- Many-to-One: User (creator)
- Many-to-Many: Services (through CampaignService)
- One-to-Many: Contracts
```

### 12. CampaignService (Join Table)
```
Fields:
- id (UUID, primary key)
- campaignPlanId (UUID, foreign key -> CampaignPlan)
- serviceId (UUID, foreign key -> Service)
- customPrice (decimal(10,2), optional)
- createdAt (timestamp)

Relations:
- Many-to-One: CampaignPlan
- Many-to-One: Service
```

### 13. Quotation Model
```
Fields:
- id (UUID, primary key)
- quotationNumber (string, unique, auto-generated, e.g., "QUO-2025-0001")
- clientId (UUID, foreign key -> Client, nullable, indexed)
- clientName (string, for global quotations without client)
- servicesPricing (JSON object): { serviceId: customPrice }
- customServices (JSON array): [
    { 
        id: string, 
        en: string, 
        ar: string, 
        price: decimal, 
        discount: decimal,
        discountType: string 
    }
]
- subtotal (decimal(10,2), calculated)
- discountValue (decimal(10,2), default: 0)
- discountType (enum: 'percentage', 'fixed', default: 'percentage')
- total (decimal(10,2), calculated)
- note (text, optional)
- status (enum: 'draft', 'sent', 'approved', 'rejected', default: 'draft')
- validUntil (date, optional)
- sentAt (timestamp, nullable)
- approvedAt (timestamp, nullable)
- rejectedAt (timestamp, nullable)
- createdBy (UUID, foreign key -> User, indexed)
- createdAt (timestamp)
- updatedAt (timestamp)
- deletedAt (timestamp, nullable)

Relations:
- Many-to-One: Client (optional)
- Many-to-One: User (creator)
- Many-to-Many: Services (through QuotationService)
- One-to-One: Contract (when converted)

Computed Fields:
- subtotal: sum of all service prices + custom service prices
- total: subtotal - discount based on discountType
```

### 14. QuotationService (Join Table)
```
Fields:
- id (UUID, primary key)
- quotationId (UUID, foreign key -> Quotation)
- serviceId (UUID, foreign key -> Service)
- customPrice (decimal(10,2), optional)
- createdAt (timestamp)

Relations:
- Many-to-One: Quotation
- Many-to-One: Service
```

### 15. Contract Model
```
Fields:
- id (UUID, primary key)
- contractNumber (string, unique, auto-generated, e.g., "CNT-2025-0001")
- clientId (UUID, foreign key -> Client, indexed)
- packageId (UUID, foreign key -> Package, optional)
- campaignPlanId (UUID, foreign key -> CampaignPlan, optional)
- quotationId (UUID, foreign key -> Quotation, optional)
- contractTerms (text, customizable, required)
- startDate (date, required)
- endDate (date, required)
- value (decimal(10,2), required)
- status (enum: 'draft', 'active', 'completed', 'cancelled', 'renewed', default: 'draft')
- signedDate (date, optional)
- createdBy (UUID, foreign key -> User, indexed)
- createdAt (timestamp)
- updatedAt (timestamp)
- deletedAt (timestamp, nullable)

Relations:
- Many-to-One: Client
- Many-to-One: Package (optional)
- Many-to-One: CampaignPlan (optional)
- Many-to-One: Quotation (optional)
- Many-to-One: User (creator)

Constraints:
- endDate must be after startDate
- At least one of packageId, campaignPlanId, or quotationId should be present
```

### 16. Report Model
```
Fields:
- id (UUID, primary key)
- clientId (UUID, foreign key -> Client, indexed)
- reportType (enum: 'monthly', 'quarterly', 'campaign', 'custom')
- period (string, e.g., "2025-01")
- title (string)
- metrics (JSON object): {
    earnings: { total: string, change: string, trend: string },
    reach: integer,
    engagement: integer,
    followers: integer,
    shares: integer
}
- platforms (JSON array): [
    { name: string, reach: integer, engagement: integer, color: string }
]
- topPosts (JSON array): [
    { id: integer, platform: string, content: string, reach: integer, engagement: integer, date: string }
]
- generatedBy (UUID, foreign key -> User, indexed)
- createdAt (timestamp)
- updatedAt (timestamp)
- deletedAt (timestamp, nullable)

Relations:
- Many-to-One: Client
- Many-to-One: User (generator)
```

### 17. AuditLog Model
```
Fields:
- id (UUID, primary key)
- userId (UUID, foreign key -> User, indexed)
- action (enum: 'create', 'read', 'update', 'delete')
- entityType (string, e.g., 'Client', 'Contract', 'Quotation')
- entityId (UUID)
- changes (JSON object, stores before/after values)
- ipAddress (string)
- userAgent (string)
- timestamp (timestamp, indexed)

Relations:
- Many-to-One: User
```

---

## API Endpoints Structure

### Authentication Endpoints
```
POST   /api/v1/auth/register
Body: { email, password, fullName, role }
Response: { user, accessToken, refreshToken }

POST   /api/v1/auth/login
Body: { email, password }
Response: { user, accessToken, refreshToken }

POST   /api/v1/auth/refresh
Body: { refreshToken }
Response: { accessToken, refreshToken }

POST   /api/v1/auth/logout
Headers: Authorization: Bearer <token>
Response: { message }

POST   /api/v1/auth/forgot-password
Body: { email }
Response: { message }

POST   /api/v1/auth/reset-password
Body: { token, newPassword }
Response: { message }

GET    /api/v1/auth/me
Headers: Authorization: Bearer <token>
Response: { user }

PUT    /api/v1/auth/profile
Headers: Authorization: Bearer <token>
Body: { fullName, email, currentPassword, newPassword }
Response: { user }
```

### Client Management Endpoints
```
GET    /api/v1/clients
Headers: Authorization: Bearer <token>
Query: page, limit, search, status, category, sortBy, sortOrder
Response: { clients[], total, page, totalPages }

POST   /api/v1/clients
Headers: Authorization: Bearer <token>
Body: { personal, business, contact, branches[], segments[], competitors[], socialLinks[], swot }
Response: { client }

GET    /api/v1/clients/:id
Headers: Authorization: Bearer <token>
Response: { client }

PUT    /api/v1/clients/:id
Headers: Authorization: Bearer <token>
Body: { personal, business, contact, status }
Response: { client }

DELETE /api/v1/clients/:id
Headers: Authorization: Bearer <token>
Response: { message }

GET    /api/v1/clients/:id/branches
Response: { branches[] }

POST   /api/v1/clients/:id/branches
Body: { name, address, phone }
Response: { branch }

PUT    /api/v1/clients/:id/branches/:branchId
Body: { name, address, phone }
Response: { branch }

DELETE /api/v1/clients/:id/branches/:branchId
Response: { message }

GET    /api/v1/clients/:id/segments
Response: { segments[] }

POST   /api/v1/clients/:id/segments
Body: { name, description, ageRange, gender, interests, incomeLevel }
Response: { segment }

PUT    /api/v1/clients/:id/segments/:segmentId
Body: { name, description, ageRange, gender, interests, incomeLevel }
Response: { segment }

DELETE /api/v1/clients/:id/segments/:segmentId
Response: { message }

GET    /api/v1/clients/:id/competitors
Response: { competitors[] }

POST   /api/v1/clients/:id/competitors
Body: { name, description, swot }
Response: { competitor }

PUT    /api/v1/clients/:id/competitors/:competitorId
Body: { name, description, swot }
Response: { competitor }

DELETE /api/v1/clients/:id/competitors/:competitorId
Response: { message }

GET    /api/v1/clients/:id/swot
Response: { swot }

PUT    /api/v1/clients/:id/swot
Body: { strengths[], weaknesses[], opportunities[], threats[] }
Response: { swot }

GET    /api/v1/clients/:id/social-links
Response: { socialLinks[] }

POST   /api/v1/clients/:id/social-links
Body: { platform, platformName, url, type }
Response: { socialLink }

PUT    /api/v1/clients/:id/social-links/:linkId
Body: { platform, platformName, url, type }
Response: { socialLink }

DELETE /api/v1/clients/:id/social-links/:linkId
Response: { message }
```

### Service Management Endpoints
```
GET    /api/v1/services
Headers: Authorization: Bearer <token>
Query: category, isGlobal, clientId, page, limit
Response: { services[], total }

POST   /api/v1/services
Headers: Authorization: Bearer <token>
Body: { en, ar, description, category, price, discount, discountType, isGlobal, clientId }
Response: { service }

GET    /api/v1/services/:id
Headers: Authorization: Bearer <token>
Response: { service }

PUT    /api/v1/services/:id
Headers: Authorization: Bearer <token>
Body: { en, ar, description, category, price, discount, discountType }
Response: { service }

DELETE /api/v1/services/:id
Headers: Authorization: Bearer <token>
Response: { message }

GET    /api/v1/services/by-category/:category
Headers: Authorization: Bearer <token>
Response: { services[] }

GET    /api/v1/clients/:clientId/services
Headers: Authorization: Bearer <token>
Response: { services[] }

POST   /api/v1/clients/:clientId/services
Headers: Authorization: Bearer <token>
Body: { en, ar, description, price, discount, discountType, quantity }
Response: { service }
```

### Package Management Endpoints
```
GET    /api/v1/packages
Headers: Authorization: Bearer <token>
Query: isActive, page, limit
Response: { packages[], total }

POST   /api/v1/packages
Headers: Authorization: Bearer <token>
Body: { nameEn, nameAr, price, discount, discountType, features[], serviceIds[] }
Response: { package }

GET    /api/v1/packages/:id
Headers: Authorization: Bearer <token>
Response: { package }

PUT    /api/v1/packages/:id
Headers: Authorization: Bearer <token>
Body: { nameEn, nameAr, price, discount, discountType, features[], serviceIds[] }
Response: { package }

DELETE /api/v1/packages/:id
Headers: Authorization: Bearer <token>
Response: { message }

PATCH  /api/v1/packages/:id/activate
Headers: Authorization: Bearer <token>
Response: { package }

PATCH  /api/v1/packages/:id/deactivate
Headers: Authorization: Bearer <token>
Response: { package }
```

### Campaign Planning Endpoints
```
GET    /api/v1/campaigns
Headers: Authorization: Bearer <token>
Query: clientId, status, page, limit
Response: { campaigns[], total }

POST   /api/v1/campaigns
Headers: Authorization: Bearer <token>
Body: { clientId, planName, objectives[], strategies[], serviceIds[], servicesPricing, budget, timeline, startDate, duration }
Response: { campaign }

GET    /api/v1/campaigns/:id
Headers: Authorization: Bearer <token>
Response: { campaign }

PUT    /api/v1/campaigns/:id
Headers: Authorization: Bearer <token>
Body: { planName, objectives[], strategies[], serviceIds[], servicesPricing, budget, timeline, startDate, duration, status }
Response: { campaign }

DELETE /api/v1/campaigns/:id
Headers: Authorization: Bearer <token>
Response: { message }

GET    /api/v1/clients/:clientId/campaigns
Headers: Authorization: Bearer <token>
Response: { campaigns[] }

POST   /api/v1/campaigns/:id/generate-strategy
Headers: Authorization: Bearer <token>
Body: { language: 'en' | 'ar' }
Response: { finalStrategy }

GET    /api/v1/campaigns/:id/download
Headers: Authorization: Bearer <token>
Query: format=pdf|docx, language=en|ar
Response: File download
```

### Quotation Endpoints
```
GET    /api/v1/quotations
Headers: Authorization: Bearer <token>
Query: clientId, status, page, limit, search
Response: { quotations[], total }

POST   /api/v1/quotations
Headers: Authorization: Bearer <token>
Body: { clientId, clientName, serviceIds[], servicesPricing, customServices[], discountValue, discountType, note, validUntil }
Response: { quotation }

GET    /api/v1/quotations/:id
Headers: Authorization: Bearer <token>
Response: { quotation }

PUT    /api/v1/quotations/:id
Headers: Authorization: Bearer <token>
Body: { serviceIds[], servicesPricing, customServices[], discountValue, discountType, note, validUntil }
Response: { quotation }

DELETE /api/v1/quotations/:id
Headers: Authorization: Bearer <token>
Response: { message }

POST   /api/v1/quotations/:id/send
Headers: Authorization: Bearer <token>
Body: { recipientEmail, message }
Response: { message }

PATCH  /api/v1/quotations/:id/approve
Headers: Authorization: Bearer <token>
Response: { quotation }

PATCH  /api/v1/quotations/:id/reject
Headers: Authorization: Bearer <token>
Body: { reason }
Response: { quotation }

GET    /api/v1/quotations/:id/pdf
Headers: Authorization: Bearer <token>
Query: language=en|ar
Response: PDF file download

POST   /api/v1/quotations/:id/convert-to-contract
Headers: Authorization: Bearer <token>
Body: { startDate, endDate, contractTerms }
Response: { contract }

GET    /api/v1/clients/:clientId/quotations
Headers: Authorization: Bearer <token>
Response: { quotations[] }
```

### Contract Endpoints
```
GET    /api/v1/contracts
Headers: Authorization: Bearer <token>
Query: clientId, status, page, limit, search
Response: { contracts[], total }

POST   /api/v1/contracts
Headers: Authorization: Bearer <token>
Body: { clientId, packageId, campaignPlanId, quotationId, contractTerms, startDate, endDate, value }
Response: { contract }

GET    /api/v1/contracts/:id
Headers: Authorization: Bearer <token>
Response: { contract }

PUT    /api/v1/contracts/:id
Headers: Authorization: Bearer <token>
Body: { contractTerms, startDate, endDate, value, status }
Response: { contract }

DELETE /api/v1/contracts/:id
Headers: Authorization: Bearer <token>
Response: { message }

PATCH  /api/v1/contracts/:id/sign
Headers: Authorization: Bearer <token>
Body: { signedDate }
Response: { contract }

PATCH  /api/v1/contracts/:id/activate
Headers: Authorization: Bearer <token>
Response: { contract }

PATCH  /api/v1/contracts/:id/complete
Headers: Authorization: Bearer <token>
Response: { contract }

PATCH  /api/v1/contracts/:id/cancel
Headers: Authorization: Bearer <token>
Body: { reason }
Response: { contract }

POST   /api/v1/contracts/:id/renew
Headers: Authorization: Bearer <token>
Body: { newStartDate, newEndDate, newValue }
Response: { contract }

GET    /api/v1/contracts/:id/download
Headers: Authorization: Bearer <token>
Query: format=pdf|docx, language=en|ar
Response: File download

GET    /api/v1/clients/:clientId/contracts
Headers: Authorization: Bearer <token>
Response: { contracts[] }
```

### Report Endpoints
```
GET    /api/v1/reports
Headers: Authorization: Bearer <token>
Query: clientId, reportType, period, page, limit
Response: { reports[], total }

POST   /api/v1/reports
Headers: Authorization: Bearer <token>
Body: { clientId, reportType, period, title, metrics, platforms, topPosts }
Response: { report }

GET    /api/v1/reports/:id
Headers: Authorization: Bearer <token>
Response: { report }

PUT    /api/v1/reports/:id
Headers: Authorization: Bearer <token>
Body: { title, metrics, platforms, topPosts }
Response: { report }

DELETE /api/v1/reports/:id
Headers: Authorization: Bearer <token>
Response: { message }

GET    /api/v1/clients/:clientId/reports
Headers: Authorization: Bearer <token>
Response: { reports[] }

GET    /api/v1/reports/:id/pdf
Headers: Authorization: Bearer <token>
Query: language=en|ar
Response: PDF file download

GET    /api/v1/reports/:id/excel
Headers: Authorization: Bearer <token>
Response: Excel file download
```

### Dashboard/Analytics Endpoints
```
GET    /api/v1/dashboard/stats
Headers: Authorization: Bearer <token>
Response: { 
    totalClients, 
    activeClients, 
    totalContracts, 
    activeContracts, 
    totalRevenue, 
    monthlyRevenue, 
    pendingQuotations,
    completedCampaigns 
}

GET    /api/v1/dashboard/recent-sales
Headers: Authorization: Bearer <token>
Query: limit (default: 10)
Response: { recentSales[] }

GET    /api/v1/dashboard/top-products
Headers: Authorization: Bearer <token>
Query: limit (default: 10)
Response: { topProducts[] }

GET    /api/v1/analytics/clients
Headers: Authorization: Bearer <token>
Query: startDate, endDate, groupBy (day|week|month)
Response: { clientGrowth[], clientsByCategory[], clientsByStatus[] }

GET    /api/v1/analytics/revenue
Headers: Authorization: Bearer <token>
Query: startDate, endDate, groupBy (day|week|month)
Response: { revenueByPeriod[], revenueByService[], revenueByClient[] }

GET    /api/v1/analytics/services
Headers: Authorization: Bearer <token>
Query: startDate, endDate
Response: { serviceUsage[], popularServices[], serviceRevenue[] }
```

---

## Business Logic & Validation Rules

### Validation Rules

#### 1. Egyptian Phone Numbers
- Format: `+201XXXXXXXXX` (international) or `01XXXXXXXXX` (local)
- Valid prefixes: 010, 011, 012, 015
- Regex: `^(\+201|01)[0-2,5][0-9]{8}$`

#### 2. Email Validation
- Standard RFC 5322 email format
- Must contain @ symbol and valid domain

#### 3. URL Validation
- Must start with http:// or https://
- Valid domain format required

#### 4. Price & Discount Validation
- Prices: Non-negative decimals, max 2 decimal places
- Discounts:
  - Percentage: 0-100
  - Fixed: >= 0, cannot exceed base price
  - Calculate final price correctly based on type

#### 5. Date Validation
- All dates must be valid ISO 8601 format
- End dates must be after start dates
- Contract duration minimum: 1 day

#### 6. Text Length Limits
- Short text (names, titles): 255 characters
- Medium text (descriptions): 1000 characters
- Long text (terms, strategy): 50000 characters

### Calculation Logic

#### 1. Package Final Price
```javascript
function calculatePackagePrice(price, discount, discountType) {
    if (!discount || discount === 0) return price;
    
    if (discountType === 'percentage') {
        return price - (price * discount / 100);
    } else {
        return price - discount;
    }
}
```

#### 2. Quotation Total
```javascript
function calculateQuotationTotal(services, customServices, quotationDiscount, quotationDiscountType) {
    // Calculate subtotal
    let subtotal = 0;
    
    // Add service prices (with individual service discounts already applied)
    services.forEach(service => {
        let servicePrice = service.customPrice || service.price;
        if (service.discount) {
            if (service.discountType === 'percentage') {
                servicePrice -= (servicePrice * service.discount / 100);
            } else {
                servicePrice -= service.discount;
            }
        }
        subtotal += servicePrice;
    });
    
    // Add custom service prices
    customServices.forEach(customService => {
        let price = customService.price;
        if (customService.discount) {
            if (customService.discountType === 'percentage') {
                price -= (price * customService.discount / 100);
            } else {
                price -= customService.discount;
            }
        }
        subtotal += price;
    });
    
    // Apply quotation-level discount
    let total = subtotal;
    if (quotationDiscount) {
        if (quotationDiscountType === 'percentage') {
            total -= (subtotal * quotationDiscount / 100);
        } else {
            total -= quotationDiscount;
        }
    }
    
    return {
        subtotal: Math.max(0, subtotal),
        total: Math.max(0, total)
    };
}
```

#### 3. Service Final Price with Discount
```javascript
function calculateServiceFinalPrice(price, discount, discountType) {
    if (!discount || discount === 0) return price;
    
    let discountAmount = 0;
    if (discountType === 'percentage') {
        discountAmount = (price * discount) / 100;
    } else {
        discountAmount = discount;
    }
    
    return Math.max(0, price - discountAmount);
}
```

### Multi-language Support

#### Request Handling
- Accept `Accept-Language` header: `en` or `ar`
- Default to `en` if not provided
- Return error messages in requested language

#### Response Format
```json
{
    "id": "uuid",
    "nameEn": "Social Media Marketing",
    "nameAr": "التسويق عبر وسائل التواصل الاجتماعي",
    "description": "Complete social media management"
}
```

For API responses, return both language fields and let frontend choose which to display.

#### Error Messages
Maintain translation files:
```javascript
// en.json
{
    "validation.email.invalid": "Please enter a valid email address",
    "validation.phone.invalid": "Please enter a valid Egyptian phone number",
    "error.client.notFound": "Client not found",
    "error.unauthorized": "Unauthorized access"
}

// ar.json
{
    "validation.email.invalid": "الرجاء إدخال بريد إلكتروني صالح",
    "validation.phone.invalid": "الرجاء إدخال رقم هاتف مصري صالح",
    "error.client.notFound": "العميل غير موجود",
    "error.unauthorized": "وصول غير مصرح به"
}
```

---

## Security Requirements

### 1. Authentication & Authorization

#### JWT Implementation
```javascript
// Access Token
- Payload: { userId, email, role }
- Expiry: 15 minutes
- Secret: Strong random string (min 32 characters)

// Refresh Token
- Payload: { userId, tokenId }
- Expiry: 7 days
- Store in database with user association
- Rotate on each refresh
```

#### Password Security
- Minimum length: 8 characters
- Must contain: uppercase, lowercase, number
- Hash with bcrypt (12 rounds)
- Never store plain text passwords

#### Role-Based Access Control (RBAC)
```
Admin:
- Full CRUD access to all entities
- User management
- System configuration

Manager:
- Full CRUD on clients, campaigns, quotations, contracts, reports
- Read-only on users
- Cannot modify system settings

Employee:
- Read access to clients, campaigns, contracts
- Create/update reports
- Cannot delete any records
- Cannot access user management
```

### 2. Data Protection

#### Input Sanitization
- Strip HTML tags from text inputs
- Escape special characters
- Validate all input against schema
- Maximum input size limits

#### SQL Injection Prevention
- Use parameterized queries/prepared statements
- Use ORM with proper escaping
- Never concatenate user input into queries

#### XSS Prevention
- Sanitize all user-generated content
- Set proper Content-Security-Policy headers
- Escape HTML in responses

### 3. API Security

#### Rate Limiting
```
General endpoints: 100 requests per 15 minutes per IP
Auth endpoints: 5 requests per 15 minutes per IP
File upload: 10 requests per hour per user
```

#### CORS Configuration
```javascript
{
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
    credentials: true,
    maxAge: 86400 // 24 hours
}
```

#### Request Size Limits
- JSON payload: 10MB max
- File uploads: 5MB per file
- Total request: 20MB max

### 4. Data Privacy

#### Soft Delete
- Never permanently delete clients, contracts, quotations
- Add `deletedAt` timestamp field
- Exclude soft-deleted records from queries by default
- Admin can restore or permanently delete

#### Data Encryption
- Encrypt sensitive data at rest (passwords, tokens)
- Use HTTPS for all communications
- Encrypt database backups

#### Audit Logging
Log all critical operations:
- User login/logout
- Client creation/modification/deletion
- Contract creation/signing/cancellation
- Quotation approval/rejection
- Package changes

---

## Error Handling

### HTTP Status Codes
```
200 OK - Successful GET, PUT, PATCH
201 Created - Successful POST
204 No Content - Successful DELETE
400 Bad Request - Validation errors, malformed request
401 Unauthorized - Missing or invalid authentication
403 Forbidden - Insufficient permissions
404 Not Found - Resource not found
409 Conflict - Duplicate resource, constraint violation
422 Unprocessable Entity - Semantic errors
429 Too Many Requests - Rate limit exceeded
500 Internal Server Error - Unexpected server error
503 Service Unavailable - Temporary downtime
```

### Error Response Format
```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid input data",
        "details": [
            {
                "field": "email",
                "message": "Invalid email format",
                "code": "INVALID_FORMAT"
            },
            {
                "field": "phone",
                "message": "Please enter a valid Egyptian phone number",
                "code": "INVALID_PHONE"
            }
        ],
        "timestamp": "2025-11-06T10:30:00Z",
        "path": "/api/v1/clients"
    }
}
```

### Common Error Codes
```
VALIDATION_ERROR - Input validation failed
AUTHENTICATION_FAILED - Invalid credentials
UNAUTHORIZED - Missing authentication
FORBIDDEN - Insufficient permissions
NOT_FOUND - Resource not found
DUPLICATE_ENTRY - Resource already exists
CONSTRAINT_VIOLATION - Database constraint failed
RATE_LIMIT_EXCEEDED - Too many requests
INTERNAL_ERROR - Server error
SERVICE_UNAVAILABLE - Service temporarily down
```

---

## Environment Variables

```bash
# Application
NODE_ENV=development
PORT=5000
API_VERSION=v1
APP_NAME=Marketing Management Dashboard
APP_URL=http://localhost:5000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/marketing_db
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_SSL=false

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# File Storage
STORAGE_TYPE=local # or 's3'
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880 # 5MB in bytes

# AWS S3 (if using S3)
AWS_REGION=us-east-1
AWS_S3_BUCKET=marketing-dashboard-files
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=Marketing Dashboard <noreply@example.com>

# Frontend
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100
RATE_LIMIT_AUTH_MAX=5

# Redis (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Logging
LOG_LEVEL=info # debug, info, warn, error
LOG_FILE=./logs/app.log

# API Documentation
SWAGGER_ENABLED=true
SWAGGER_PATH=/api-docs

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-min-32-chars
CORS_ENABLED=true

# Features
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_AUDIT_LOGGING=true
ENABLE_FILE_UPLOAD=true
```

---

## Database Indexing Strategy

### Primary Indexes
```sql
-- User table
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_role ON users(role);
CREATE INDEX idx_user_active ON users(is_active);

-- Client table
CREATE INDEX idx_client_created_by ON clients(created_by);
CREATE INDEX idx_client_status ON clients(status);
CREATE INDEX idx_client_business_name ON clients(business_name);
CREATE INDEX idx_client_category ON clients(business_category);
CREATE INDEX idx_client_deleted_at ON clients(deleted_at);

-- Branch table
CREATE INDEX idx_branch_client_id ON branches(client_id);

-- Segment table
CREATE INDEX idx_segment_client_id ON segments(client_id);

-- Competitor table
CREATE INDEX idx_competitor_client_id ON competitors(client_id);

-- SocialLink table
CREATE INDEX idx_sociallink_client_id ON social_links(client_id);

-- SwotAnalysis table
CREATE INDEX idx_swot_client_id ON swot_analysis(client_id);

-- Service table
CREATE INDEX idx_service_category ON services(category);
CREATE INDEX idx_service_client_id ON services(client_id);
CREATE INDEX idx_service_is_global ON services(is_global);
CREATE INDEX idx_service_deleted_at ON services(deleted_at);

-- Package table
CREATE INDEX idx_package_is_active ON packages(is_active);
CREATE INDEX idx_package_deleted_at ON packages(deleted_at);

-- CampaignPlan table
CREATE INDEX idx_campaign_client_id ON campaign_plans(client_id);
CREATE INDEX idx_campaign_created_by ON campaign_plans(created_by);
CREATE INDEX idx_campaign_status ON campaign_plans(status);
CREATE INDEX idx_campaign_deleted_at ON campaign_plans(deleted_at);

-- Quotation table
CREATE INDEX idx_quotation_client_id ON quotations(client_id);
CREATE INDEX idx_quotation_created_by ON quotations(created_by);
CREATE INDEX idx_quotation_status ON quotations(status);
CREATE INDEX idx_quotation_number ON quotations(quotation_number);
CREATE INDEX idx_quotation_deleted_at ON quotations(deleted_at);

-- Contract table
CREATE INDEX idx_contract_client_id ON contracts(client_id);
CREATE INDEX idx_contract_created_by ON contracts(created_by);
CREATE INDEX idx_contract_status ON contracts(status);
CREATE INDEX idx_contract_number ON contracts(contract_number);
CREATE INDEX idx_contract_start_date ON contracts(start_date);
CREATE INDEX idx_contract_deleted_at ON contracts(deleted_at);

-- Report table
CREATE INDEX idx_report_client_id ON reports(client_id);
CREATE INDEX idx_report_generated_by ON reports(generated_by);
CREATE INDEX idx_report_type ON reports(report_type);
CREATE INDEX idx_report_period ON reports(period);

-- AuditLog table
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
```

### Composite Indexes
```sql
-- For common query patterns
CREATE INDEX idx_client_status_category ON clients(status, business_category);
CREATE INDEX idx_campaign_client_status ON campaign_plans(client_id, status);
CREATE INDEX idx_quotation_client_status ON quotations(client_id, status);
CREATE INDEX idx_contract_client_status ON contracts(client_id, status);
```

---

## Testing Requirements

### 1. Unit Tests
Test individual functions and methods:
- Validation functions
- Calculation logic (pricing, discounts)
- Date utilities
- Authentication helpers
- Error handling

**Coverage Target**: Minimum 80%

### 2. Integration Tests
Test API endpoints:
- All CRUD operations
- Authentication flow
- Authorization checks
- Error responses
- Pagination and filtering

### 3. End-to-End Tests
Test complete workflows:
- Client onboarding process
- Campaign creation and strategy generation
- Quotation creation, approval, and conversion to contract
- Contract lifecycle
- Report generation

### 4. Test Data
Provide seed scripts:
```javascript
// seeds/
- users.seed.js (admin, manager, employee users)
- clients.seed.js (10-20 sample clients with full data)
- services.seed.js (master service list)
- packages.seed.js (5-10 sample packages)
- campaigns.seed.js (sample campaign plans)
- quotations.seed.js (sample quotations)
- contracts.seed.js (sample contracts)
```

### 5. Test Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "jest --testPathPattern=e2e"
  }
}
```

---

## Performance Optimization

### 1. Database Optimization
- Use connection pooling (min: 2, max: 10)
- Implement proper indexes
- Use eager loading for related entities
- Batch operations when possible
- Use database transactions for multi-step operations

### 2. Caching Strategy
Use Redis for:
- Dashboard statistics (5 minutes TTL)
- Master service list (1 hour TTL)
- Package list (30 minutes TTL)
- User sessions
- Rate limiting counters

```javascript
// Example cache keys
dashboard:stats:{userId}
services:master:all
packages:active:all
user:session:{userId}
ratelimit:{ip}:{endpoint}
```

### 3. Pagination
Mandatory for all list endpoints:
- Default page size: 20
- Maximum page size: 100
- Return metadata: total, page, totalPages, hasNext, hasPrev

```json
{
    "data": [...],
    "meta": {
        "total": 150,
        "page": 1,
        "limit": 20,
        "totalPages": 8,
        "hasNext": true,
        "hasPrev": false
    }
}
```

### 4. Query Optimization
- Use `SELECT` only needed fields
- Implement cursor-based pagination for large datasets
- Use database views for complex queries
- Avoid N+1 queries with proper joins/eager loading

### 5. Response Time Targets
- GET endpoints: < 200ms
- POST/PUT endpoints: < 500ms
- Complex reports: < 2s
- File downloads: < 5s

---

## API Documentation

### Swagger/OpenAPI Setup
Generate interactive API documentation:

```yaml
openapi: 3.0.0
info:
  title: Marketing Management Dashboard API
  version: 1.0.0
  description: RESTful API for marketing management with bilingual support
  contact:
    name: API Support
    email: support@example.com

servers:
  - url: http://localhost:5000/api/v1
    description: Development server
  - url: https://api.example.com/api/v1
    description: Production server

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Client:
      type: object
      properties:
        id:
          type: string
          format: uuid
        personal:
          type: object
          properties:
            fullName:
              type: string
            email:
              type: string
              format: email
            phone:
              type: string
              pattern: '^(\+201|01)[0-2,5][0-9]{8}$'
        # ... more fields

security:
  - bearerAuth: []
```

Access documentation at: `http://localhost:5000/api-docs`

---

## Deployment Guide

### Prerequisites
- Node.js 18+ (or Python 3.10+)
- PostgreSQL 14+
- Redis 6+ (optional, for caching)
- AWS account (if using S3)

### Development Setup
```bash
# Clone repository
git clone <repo-url>
cd marketing-dashboard-backend

# Install dependencies
npm install # or pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run db:create
npm run db:migrate
npm run db:seed

# Run development server
npm run dev

# Run tests
npm test
```

### Production Deployment

#### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/marketing_db
    depends_on:
      - db
      - redis
  
  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: marketing_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### Using PM2 (Node.js)
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "marketing-api" -- start

# Setup auto-restart
pm2 startup
pm2 save
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## Monitoring & Logging

### Application Logging
Use structured logging:
```javascript
logger.info('Client created', {
    clientId: client.id,
    userId: user.id,
    timestamp: new Date().toISOString()
});

logger.error('Database error', {
    error: err.message,
    stack: err.stack,
    context: 'createClient'
});
```

### Health Check Endpoint
```
GET /api/v1/health
Response: {
    "status": "ok",
    "timestamp": "2025-11-06T10:30:00Z",
    "uptime": 3600,
    "database": "connected",
    "redis": "connected"
}
```

### Metrics to Track
- Request count by endpoint
- Response times (average, p95, p99)
- Error rates by type
- Active users
- Database connection pool status
- Cache hit/miss rates

---

## Additional Features

### 1. Email Templates
Create HTML email templates for:
- Welcome email (new client onboarding)
- Quotation sent
- Quotation approved/rejected
- Contract signed
- Contract expiring soon
- Monthly report ready
- Password reset

### 2. PDF Generation
Use libraries like:
- Node.js: `pdfkit`, `puppeteer`, or `jspdf`
- Python: `reportlab`, `weasyprint`

Generate PDFs for:
- Quotations (with company branding)
- Contracts (formatted legal document)
- Reports (charts and tables)
- Campaign strategies

### 3. Export Functionality
Support exporting data as:
- CSV: Client lists, service lists
- Excel: Reports with multiple sheets
- PDF: Formal documents
- JSON: Data backup/migration

### 4. Webhook Support
Allow external systems to subscribe to events:
- Client created
- Contract signed
- Quotation approved
- Report generated

### 5. Bulk Operations
Endpoints for:
- Bulk import clients (CSV)
- Bulk update services
- Bulk send quotations
- Bulk export data

---

## Migration & Backup Strategy

### Database Migrations
Use migration tools:
- Node.js: Knex.js, Sequelize, or Prisma Migrate
- Python: Alembic (SQLAlchemy)

Version control all schema changes:
```
migrations/
  001_create_users_table.sql
  002_create_clients_table.sql
  003_add_client_status_field.sql
```

### Backup Strategy
- Automated daily database backups
- Retain backups for 30 days
- Weekly full backups to off-site storage
- Test restore process monthly
- Backup environment variables separately

### Data Import/Export
Provide scripts for:
- Exporting data from localStorage format
- Importing existing client data
- Migrating between environments
- Data anonymization for testing

---

## Support & Maintenance

### Documentation Required
1. **API Reference**: Complete Swagger documentation
2. **Setup Guide**: Development environment setup
3. **Deployment Guide**: Production deployment steps
4. **Database Schema**: ERD and table descriptions
5. **Architecture Diagram**: System components and flow
6. **Troubleshooting Guide**: Common issues and solutions

### Maintenance Tasks
- Regular dependency updates
- Security patches
- Database optimization (VACUUM, ANALYZE)
- Log rotation
- Performance monitoring
- Backup verification

---

## Success Criteria

The backend implementation is complete when:
1. ✅ All API endpoints are implemented and tested
2. ✅ Authentication and authorization working correctly
3. ✅ Database schema matches requirements
4. ✅ All validations properly implemented
5. ✅ Error handling consistent across all endpoints
6. ✅ API documentation complete and accurate
7. ✅ Test coverage above 80%
8. ✅ Performance targets met
9. ✅ Security best practices followed
10. ✅ Deployment guide verified in production environment

---

**Generated**: November 6, 2025  
**Version**: 1.0.0  
**For**: Marketing Management Dashboard Frontend  
**Repository**: marktingmangmentdashboard
