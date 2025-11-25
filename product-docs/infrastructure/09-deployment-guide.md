# Deployment Guide & HTTPS Setup

## Remote Deployment

The project includes an automated deployment script for VPS environments.

### Prerequisites
- SSH access to the VPS (key at `deploy/vps_key`)
- Docker and Docker Compose installed on the VPS
- Node.js installed on the VPS (for some script operations)

### Deploying Updates
Run the following command from the project root:
```bash
./deploy/deploy-remote.sh
```

## HTTPS Configuration (SSL/TLS)

The project uses **Caddy** as a reverse proxy, which automatically handles HTTPS certificates.

### Current Status (IP-based HTTPS)
Currently, the server is configured to use a **self-signed certificate** for the IP address `135.181.96.93`.
- **Browser Warning**: You will see a "Not Secure" warning because the certificate is not issued by a trusted authority (like Let's Encrypt).
- **Encryption**: The connection is still encrypted.

### Setting up a Real Domain (Green Lock)
To get a trusted HTTPS connection (no warnings), you must use a domain name.

1.  **Purchase a Domain**: Buy a domain (e.g., `yellowgrid.com`) from a registrar (Namecheap, GoDaddy, etc.).
2.  **Configure DNS**: Create an **A Record** in your domain's DNS settings pointing to `135.181.96.93`.
3.  **Update Caddyfile**:
    - Open `deploy/Caddyfile`.
    - Replace the IP address `135.181.96.93` with your domain name.
    - Remove the `tls internal` line.
    
    **Example `deploy/Caddyfile`:**
    ```caddyfile
    your-domain.com {
        encode gzip
        
        handle /api/* {
            reverse_proxy api:3000
        }
        
        handle {
            root * /srv
            try_files {path} /index.html
            file_server
        }
    }
    ```
4.  **Redeploy**:
    ```bash
    ./deploy/deploy-remote.sh
    ```

Caddy will automatically negotiate with Let's Encrypt to obtain and renew a valid SSL certificate for your domain.
