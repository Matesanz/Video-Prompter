# Use the official nginx image as base
FROM nginx:alpine

# Copy the application files from src directory to nginx html directory
COPY src /usr/share/nginx/html/
COPY README.md /usr/share/nginx/html/

# Create a custom nginx configuration for PWA
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
