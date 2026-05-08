FROM node:20-alpine

WORKDIR /app

# Copy package info
COPY package*.json ./

# Install dependensi
RUN npm install

# Copy source code
COPY . .

# Expose port yang digunakan Express
EXPOSE 5000

# Menjalankan server
CMD ["npm", "start"]
