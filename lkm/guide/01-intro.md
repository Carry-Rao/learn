# LKM 简介与环境准备

## 什么是 LKM

LKM (Loadable Kernel Module) 是可以在运行时动态加载到内核的代码片段。用途包括：
- 设备驱动（字符设备、块设备、网络设备）
- 文件系统
- 系统调用钩子
- 安全审计工具

优点：无需重编译内核即可扩展功能。

## 环境准备

### 1. 安装 Linux Headers

Headers 是编译内核模块的必需品，包含内核源码头文件。

```bash
# Debian/Ubuntu
sudo apt install linux-headers-$(uname -r)

# Arch Linux
sudo pacman -S linux-headers

# Fedora/RHEL
sudo dnf install kernel-devel-$(uname -r)
```

### 2. 验证 Headers 安装

```bash
ls /lib/modules/$(uname -r)/build
```

如果有输出，说明 headers 已正确安装。

### 3. 必备工具

```bash
# Debian/Ubuntu
sudo apt install build-essential make gcc

# Arch
sudo pacman -S base-devel

# Fedora
sudo dnf groupinstall "Development Tools"
```
