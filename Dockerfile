FROM debian:trixie

RUN apt-get update && apt-get install -y \
    zsh \
    tmux \
    procps \
    wget \
    curl \
    btop \
    git \
    golang-go \
    unzip \
    ca-certificates \
    neovim \
    nano \
    atuin \
    zoxide \
    fzf \
    ripgrep \
    fd-find \
    build-essential \
    locales \
    jq \
    && ln -s $(which fdfind) /usr/local/bin/fd \
    && rm -rf /var/lib/apt/lists/*

# Configure Locale
RUN echo "en_US.UTF-8 UTF-8" > /etc/locale.gen && \
    locale-gen
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

# Install eza (latest)
RUN EZA_VERSION=$(curl -s "https://api.github.com/repos/eza-community/eza/releases/latest" | jq -r .tag_name) && \
    wget -q "https://github.com/eza-community/eza/releases/download/${EZA_VERSION}/eza_x86_64-unknown-linux-gnu.tar.gz" && \
    tar -xzf eza_x86_64-unknown-linux-gnu.tar.gz && \
    mv eza /usr/local/bin/eza && \
    chmod +x /usr/local/bin/eza && \
    rm eza_x86_64-unknown-linux-gnu.tar.gz

# Install fastfetch (latest)
RUN FASTFETCH_VERSION=$(curl -s "https://api.github.com/repos/fastfetch-cli/fastfetch/releases/latest" | jq -r .tag_name) && \
    wget -q "https://github.com/fastfetch-cli/fastfetch/releases/download/${FASTFETCH_VERSION}/fastfetch-linux-amd64.tar.gz" && \
    tar -xzf fastfetch-linux-amd64.tar.gz && \
    mv fastfetch-linux-amd64/usr/bin/fastfetch /usr/local/bin/fastfetch && \
    chmod +x /usr/local/bin/fastfetch && \
    rm -rf fastfetch-linux-amd64.tar.gz fastfetch-linux-amd64

# Install Oh My Zsh
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# Install NvChad
RUN git clone https://github.com/NvChad/starter /root/.config/nvim

# Install Oh My Posh
RUN git clone https://github.com/JanDeDobbeleer/oh-my-posh.git /tmp/oh-my-posh && \
    cd /tmp/oh-my-posh/src && \
    go build -o /usr/local/bin/oh-my-posh && \
    rm -rf /tmp/oh-my-posh

ENV PATH=$PATH:/root/go/bin

# Install Zsh Plugins
RUN git clone https://github.com/zsh-users/zsh-autosuggestions /root/.oh-my-zsh/custom/plugins/zsh-autosuggestions && \
    git clone https://github.com/zsh-users/zsh-syntax-highlighting.git /root/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting && \
    git clone https://github.com/Aloxaf/fzf-tab /root/.oh-my-zsh/custom/plugins/fzf-tab

# Configure .zshrc
COPY oops.omp.json /root/oops.omp.json
RUN sed -i 's/ZSH_THEME="robbyrussell"/ZSH_THEME=""/' /root/.zshrc && \
    sed -i 's/plugins=(git)/plugins=(git tmux zsh-autosuggestions zsh-syntax-highlighting fzf fzf-tab)/' /root/.zshrc && \
    echo 'eval "$(oh-my-posh init zsh --config /root/oops.omp.json)"' >> /root/.zshrc && \
    echo 'eval "$(atuin init zsh)"' >> /root/.zshrc && \
    echo 'eval "$(zoxide init zsh)"' >> /root/.zshrc && \
    echo 'alias ls="eza --icons -la"' >> /root/.zshrc && \
    echo 'alias dir="eza --icons -la"' >> /root/.zshrc

# Configure Tmux
# Create resurrect directory manually to ensure it exists
RUN mkdir -p /root/.tmux/resurrect
RUN git clone https://github.com/tmux-plugins/tpm /root/.tmux/plugins/tpm
COPY .tmux.conf /root/.tmux.conf
# Install plugins headlessly
RUN /root/.tmux/plugins/tpm/bin/install_plugins

# Install Python and Tools
# python-is-python3 ensures 'python' command exists
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Install Common Python Libs/Tools (globally, overriding Debian safety for this container)
RUN pip3 install --break-system-packages --no-cache-dir \
    ipython \
    requests \
    black \
    pylint \
    mypy \
    flake8 \
    httpie

# Setup Web Console
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*
RUN npm install -g nodemon
WORKDIR /app
COPY web/package.json .
RUN npm install
COPY web/ .

# Expose Web Console Port
EXPOSE 8765

ENV SHELL=/bin/zsh
