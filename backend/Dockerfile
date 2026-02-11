# Node.js 20 on Debian Bookworm
FROM node:20-bookworm

# Install Python 3, pip, and ffmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp (latest release)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Install Python dependencies
# Using break-system-packages because we are in a container environment
RUN pip3 install torch --index-url https://download.pytorch.org/whl/cpu --break-system-packages
RUN pip3 install openai-whisper --break-system-packages

# Copy and install Node dependencies
COPY package*.json ./
RUN npm install --production

# Copy app source
COPY . .

# Create directories for uploads
RUN mkdir -p uploads transcriptions

EXPOSE 3001

CMD ["node", "index.js"]
