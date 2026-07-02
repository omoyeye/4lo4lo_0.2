# Deployment Steps for GrowSocial

Follow these steps to ensure your app deploys correctly:

1. Before deploying, make sure the build process completes successfully:
   ```
   npm run build
   ```

2. After building, verify that the static files are properly generated in the `dist/public` directory.

3. When deploying on Replit, ensure that the deployment settings are:
   - Build command: `npm run build`
   - Run command: `node dist/index.js`

4. Important: The NODE_ENV environment variable must be set to "production" for the deployed version.

5. If you encounter a blank page after deployment, check the server logs for any errors.