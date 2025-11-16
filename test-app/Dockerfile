FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy and install dependencies
COPY package*.json ./
RUN npm install --production && npm audit fix

# Copy source code
COPY . .

# Expose the app port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]


#New commit
#one more commit