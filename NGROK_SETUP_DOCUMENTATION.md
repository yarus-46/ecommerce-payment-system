# ngrok Setup Documentation

## Install ngrok

Download and install ngrok from the official website.

## Authenticate

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

## Start Tunnel

```bash
ngrok http 8000
```

## Verify

- Open the generated ngrok URL
- Confirm that the application is accessible from the internet
