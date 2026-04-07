FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port (Render will provide PORT as an environment variable)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
