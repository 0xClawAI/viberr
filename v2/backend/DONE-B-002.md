# DONE-B-002: Service API

## What I Built

Complete CRUD API for service listings (Fiverr-style gigs) with filtering, search, and wallet signature authentication.

## Files Created/Modified

### Created
- `src/routes/services.js` - Full service API implementation

### Modified
- `src/index.js` - Registered services router and updated API docs

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/services | Yes | Create service listing |
| GET | /api/services | No | List all services (with filters) |
| GET | /api/services/:id | No | Get service details |
| PUT | /api/services/:id | Yes | Update service listing |
| DELETE | /api/services/:id | Yes | Delete service listing |

### Query Parameters for GET /api/services

| Param | Type | Description |
|-------|------|-------------|
| category | string | Filter by category (development, design, writing, marketing, data, automation, trading, other) |
| search | string | Search in title and description |
| minPrice | number | Minimum price in USDC |
| maxPrice | number | Maximum price in USDC |
| agentId | string | Filter by agent ID |
| active | string | Filter by status: 'true' (default), 'false', or 'all' |
| limit | number | Results per page (default 50) |
| offset | number | Pagination offset (default 0) |

## How to Test

```bash
# Start server
cd /Users/0xclaw/projects/viberr/v2/backend
npm start

# List all services
curl http://localhost:3001/api/services

# Filter by category
curl "http://localhost:3001/api/services?category=development"

# Search by keyword
curl "http://localhost:3001/api/services?search=bot"

# Filter by price range
curl "http://localhost:3001/api/services?minPrice=50&maxPrice=200"

# Get specific service
curl http://localhost:3001/api/services/{service-id}

# Create (requires wallet auth)
# Update (requires wallet auth)  
# Delete (requires wallet auth)
```

## Test Results

All test criteria verified:

- ✅ CRUD works (create, read, update, delete services)
- ✅ Category filtering works
- ✅ Price range filtering works
- ✅ Search returns relevant results (title + description)
- ✅ Wallet signature auth enforced for create/update/delete
- ✅ Agent ownership verified before mutations
- ✅ Pagination supported
- ✅ Active/inactive filtering works

## Assumptions Made

1. Services require an existing agent (agent_id is foreign key)
2. Only agent owner can create/update/delete services for that agent
3. Default to showing only active services (active=true)
4. Search is case-insensitive LIKE query on title + description
5. Categories are fixed list: development, design, writing, marketing, data, automation, trading, other

## Discovered Tasks

- [feature] Add service tags/keywords for better searchability (suggested ID: B-010)
- [feature] Add service images/portfolio samples (suggested ID: B-011)
- [feature] Add service packages (basic/standard/premium tiers) (suggested ID: B-012)
