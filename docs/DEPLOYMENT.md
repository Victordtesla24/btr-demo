# Deployment Guide for BPHS-BTR Prototype

This guide explains how to deploy the Birth Time Rectification (BTR) prototype to free-tier hosting platforms.

## Prerequisites

- Git repository with your code
- OpenCage API key ([Get one here](https://opencagedata.com/api))
- Account on a hosting platform (Render, Railway, Fly.io, etc.)

## Platform Options

### Option 1: Render.com (Recommended for Free Tier)

Render offers a free tier with 512MB RAM, suitable for this prototype.

#### Steps:

1. **Push code to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create a new Web Service on Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure the service**:
   - **Name**: `bphs-btr-prototype` (or your choice)
   - **Environment**: `Python 3`
   - **Build Command**:
     ```bash
     pip install --upgrade pip
     pip install -r requirements.txt
     cd frontend-react && npm install && npm run build
     ```
   - **Start Command** (Render will use Procfile automatically, or specify):
     ```bash
     uvicorn backend.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Plan**: Free
   - **Note**: Render will automatically detect the `Procfile` if present
   - **Note**: The React frontend will be built and served from `frontend-react/dist` directory

4. **Set Environment Variables**:
   - Click "Environment" tab
   - Add:
     - `OPENCAGE_API_KEY` = `<your_api_key>`
     - `EPHE_PATH` = (leave empty or set if you have ephemeris files)
     - `PYTHON_VERSION` = `3.10` (or your version)

5. **Deploy**:
   - Click "Create Web Service"
   - Wait for build to complete (~5-10 minutes)
   - Your app will be available at `https://your-app-name.onrender.com`

6. **Static Frontend** (Optional):
   - Create a separate "Static Site" service
   - Point to `/frontend` directory
   - Or serve frontend from the same service (already configured in `main.py`)

---

### Option 2: Railway.app

Railway offers a free tier with $5 credit per month.

#### Steps:

1. **Install Railway CLI** (optional):
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Create a new project**:
   - Go to [Railway Dashboard](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

3. **Configure**:
   - Railway auto-detects Python
   - Add environment variables:
     - `OPENCAGE_API_KEY`
     - `EPHE_PATH` (optional)

4. **Deploy**:
   - Railway will auto-deploy on push
   - Get your URL from the dashboard

---

### Option 3: Fly.io

Fly.io offers a free tier with 3 shared VMs.

#### Steps:

1. **Install Fly CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Create `fly.toml`** in project root:
   ```toml
   app = "bphs-btr-prototype"
   primary_region = "iad"

   [build]
     builder = "paketobuildpacks/builder:base"

   [http_service]
     internal_port = 8000
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0
     processes = ["app"]

   [[services]]
     protocol = "tcp"
     internal_port = 8000
   ```

3. **Deploy**:
   ```bash
   fly launch
   fly secrets set OPENCAGE_API_KEY=your_key_here
   fly deploy
   ```

---

## Environment Variables

Set these in your hosting platform's dashboard:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENCAGE_API_KEY` | Yes | OpenCage geocoding API key ([Get free key](https://opencagedata.com/api)) |
| `EPHE_PATH` | No | Path to Swiss Ephemeris data files (optional, uses default if empty) |
| `PYTHON_VERSION` | No | Python version (default: 3.10, specified in `runtime.txt`) |
| `PORT` | Auto | Port assigned by platform (usually auto-set, used in Procfile) |

### Creating `.env` file for local development:

Create a `.env` file in the project root with:
```bash
OPENCAGE_API_KEY=your_opencage_api_key_here
EPHE_PATH=
HOST=127.0.0.1
PORT=8000
DEBUG=false
ENVIRONMENT=development
LOG_LEVEL=INFO
```

## Post-Deployment

1. **Test the API**:
   ```bash
   curl https://your-app-url.onrender.com/api/geocode?q=Delhi
   ```

2. **Test BTR endpoint**:
   ```bash
   curl -X POST https://your-app-url.onrender.com/api/btr \
     -H "Content-Type: application/json" \
     -d '{
       "dob": "1997-12-18",
       "pob_text": "Delhi, India",
       "tz_offset_hours": 5.5,
       "approx_tob": {
         "mode": "approx",
         "center": "11:00",
         "window_hours": 3.0
       }
     }'
   ```

3. **Access the frontend**:
   - Navigate to `https://your-app-url.onrender.com` in a browser
   - The frontend should load automatically

## Troubleshooting

### Build Fails

- **Issue**: `pyswisseph` installation fails
- **Solution**: Ensure Python 3.10+ is specified. Some platforms may need:
  ```bash
  pip install --upgrade pip setuptools wheel
  pip install pyswisseph
  ```

### API Key Not Found

- **Issue**: `OPENCAGE_API_KEY is not configured`
- **Solution**: Verify environment variable is set correctly in platform dashboard

### Port Issues

- **Issue**: App crashes on startup
- **Solution**: Ensure start command uses `$PORT` environment variable:
  ```bash
  uvicorn backend.main:app --host 0.0.0.0 --port $PORT
  ```

### CORS Errors

- **Issue**: Frontend can't call API
- **Solution**: CORS is already configured in `main.py`. If deploying separately, update `app.js` to use full backend URL.

## Cost Considerations

- **Render Free Tier**: 750 hours/month, spins down after 15 min inactivity
- **Railway Free Tier**: $5 credit/month (~500 hours)
- **Fly.io Free Tier**: 3 shared VMs, 160GB outbound data/month

## Monitoring

- Check platform logs for errors
- Monitor API usage (OpenCage has free tier limits: 2,500 requests/day)
- Set up alerts for deployment failures

## Scaling

For production use:
- Upgrade to paid tier for always-on service
- Add caching for geocoding results
- Consider CDN for static frontend
- Add rate limiting for API endpoints

---

**Note**: This is a prototype. For production use, add proper error handling, logging, and security measures.
