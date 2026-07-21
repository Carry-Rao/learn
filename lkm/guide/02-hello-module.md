# 第一个内核模块

### hello.c

```c
#include <linux/module.h>
#include <linux/kernel.h>

static int __init hello_init(void)
{
    pr_info("Hello, Kernel!\n");
    return 0;
}

static void __exit hello_exit(void)
{
    pr_info("Goodbye, Kernel!\n");
}

module_init(hello_init);
module_exit(hello_exit);
MODULE_LICENSE("GPL");
MODULE_AUTHOR("Your Name");
MODULE_DESCRIPTION("A simple hello world LKM");
```

### 关键点

| 宏/函数 | 说明 |
|---------|------|
| `module_init()` | 注册模块加载时执行的函数 |
| `module_exit()` | 注册模块卸载时执行的函数 |
| `__init` | 标记函数为初始化代码，加载后可释放内存 |
| `__exit` | 标记函数为清理代码，内置编译时可忽略 |
| `MODULE_LICENSE("GPL")` | 声明许可证，缺少会导致内核污染警告 |
| `pr_info()` | 内核日志打印（替代 printf） |

## 编译与构建

### 基础 Makefile

```makefile
obj-m += hello.o

KERNELDIR ?= /lib/modules/$(shell uname -r)/build
PWD := $(shell pwd)

all:
	$(MAKE) -C $(KERNELDIR) M=$(PWD) modules

clean:
	$(MAKE) -C $(KERNELDIR) M=$(PWD) clean
```

### Makefile 详解

| 变量/指令 | 说明 |
|-----------|------|
| `obj-m += hello.o` | 编译为可加载模块（-m 表示 module） |
| `obj-y += hello.o` | 编译进内核（built-in） |
| `-C $(KERNELDIR)` | 切换到内核源码目录 |
| `M=$(PWD)` | 指定模块源码所在目录 |

### 构建命令

```bash
make
```

生成文件：
- `hello.ko` — 编译好的内核模块
- `hello.mod.c` — 模块元信息
- `hello.mod.o` — 模块编译中间文件
- `hello.o` — 模块目标文件

### 交叉编译

```bash
make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu-
```

## 加载与卸载

### 基本操作

```bash
# 加载模块
sudo insmod hello.ko

# 卸载模块
sudo rmmod hello

# 查看已加载模块
lsmod

# 查看模块信息
modinfo hello.ko

# 查看内核日志
dmesg | tail
```

### insmod vs modprobe

| 命令 | 说明 |
|------|------|
| `insmod` | 直接加载 .ko 文件，不处理依赖 |
| `modprobe` | 自动处理依赖，从 `/lib/modules/` 加载 |

```bash
# modprobe 用法
sudo modprobe hello

# 卸载（同样处理依赖）
sudo modprobe -r hello
```

### 开机自动加载

```bash
# 方法1: 加入 /etc/modules
echo "hello" | sudo tee -a /etc/modules

# 方法2: 使用 /etc/modules-load.d/
echo "hello" | sudo tee /etc/modules-load.d/hello.conf
```
