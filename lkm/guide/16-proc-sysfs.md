# /proc 与 /sys API 文档

## 目录

- [1. /proc 文件系统](#1-proc-文件系统)
  - [1.1 proc_create](#11-proc_create)
  - [1.2 proc_create_data](#12-proc_create_data)
  - [1.3 proc_mkdir](#13-proc_mkdir)
  - [1.4 proc_mkdir_data](#14-proc_mkdir_data)
  - [1.5 proc_remove](#15-proc_remove)
  - [1.6 proc_ops](#16-proc_ops)
  - [1.7 seq_file 接口](#17-seq_file-接口)
  - [1.8 /proc 目录辅助宏](#18-proc-目录辅助宏)
- [2. sysfs 接口](#2-sysfs-接口)
  - [2.1 kobject, kset, kobj_type](#21-kobject-kset-kobj_type)
  - [2.2 kobject 创建与销毁](#22-kobject-创建与销毁)
  - [2.3 sysfs 文件操作](#23-sysfs-文件操作)
  - [2.4 sysfs 通知](#24-sysfs-通知)
  - [2.5 属性文件结构体](#25-属性文件结构体)
  - [2.6 show/store 回调](#26-showstore-回调)
  - [2.7 宏定义辅助](#27-宏定义辅助)
- [3. configfs](#3-configfs)
  - [3.1 configfs 目录操作](#31-configfs-目录操作)
  - [3.2 configfs item 操作](#32-configfs-item-操作)

---

## 1. /proc 文件系统

### 1.1 proc_create

创建 `/proc` 下的文件条目。

```c
struct proc_dir_entry *proc_create(
    const char *name,
    umode_t mode,
    struct proc_dir_entry *parent,
    const struct proc_ops *proc_ops
);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `const char *` | 文件名（不含路径前缀） |
| `mode` | `umode_t` | 文件权限（如 0644），可含 `S_IFREG` 标志 |
| `parent` | `struct proc_dir_entry *` | 父目录，`NULL` 表示 `/proc` 根目录 |
| `proc_ops` | `const struct proc_ops *` | 操作函数集 |

**返回值：** 成功返回 `struct proc_dir_entry *` 指针，失败返回 `NULL`。

**使用示例：**

```c
#include <linux/proc_fs.h>

static ssize_t my_read(struct file *file, char __user *buf,
                       size_t count, loff_t *ppos)
{
    return simple_read_from_buffer(buf, count, ppos, "hello\n", 6);
}

static const struct proc_ops my_proc_ops = {
    .proc_read = my_read,
};

static struct proc_dir_entry *entry;

static int __init my_init(void)
{
    entry = proc_create("myinfo", 0444, NULL, &my_proc_ops);
    if (!entry)
        return -ENOMEM;
    return 0;
}

static void __exit my_exit(void)
{
    proc_remove(entry);
}

module_init(my_init);
module_exit(my_exit);
```

---

### 1.2 proc_create_data

创建 `/proc` 文件并关联私有数据。

```c
struct proc_dir_entry *proc_create_data(
    const char *name,
    umode_t mode,
    struct proc_dir_entry *parent,
    const struct proc_ops *proc_ops,
    void *data
);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `const char *` | 文件名 |
| `mode` | `umode_t` | 文件权限 |
| `parent` | `struct proc_dir_entry *` | 父目录，`NULL` 表示 `/proc` 根目录 |
| `proc_ops` | `const struct proc_ops *` | 操作函数集 |
| `data` | `void *` | 私有数据指针，可通过 `PDE_DATA(file_inode(file))` 获取 |

**返回值：** 成功返回 `struct proc_dir_entry *`，失败返回 `NULL`。

**使用示例：**

```c
#include <linux/proc_fs.h>

struct my_device {
    int value;
    char name[32];
};

static struct my_device dev = {
    .value = 42,
    .name  = "test_device",
};

static ssize_t my_read(struct file *file, char __user *buf,
                       size_t count, loff_t *ppos)
{
    struct my_device *d = PDE_DATA(file_inode(file));
    char tmp[64];
    int len = snprintf(tmp, sizeof(tmp), "%s: %d\n", d->name, d->value);
    return simple_read_from_buffer(buf, count, ppos, tmp, len);
}

static const struct proc_ops my_proc_ops = {
    .proc_read = my_read,
};

static struct proc_dir_entry *entry;

static int __init my_init(void)
{
    entry = proc_create_data("mydev", 0444, NULL, &my_proc_ops, &dev);
    if (!entry)
        return -ENOMEM;
    return 0;
}

static void __exit my_exit(void)
{
    proc_remove(entry);
}

module_init(my_init);
module_exit(my_exit);
```

---

### 1.3 proc_mkdir

在 `/proc` 下创建目录。

```c
struct proc_dir_entry *proc_mkdir(
    const char *name,
    struct proc_dir_entry *parent
);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `const char *` | 目录名 |
| `parent` | `struct proc_dir_entry *` | 父目录，`NULL` 表示 `/proc` 根目录 |

**返回值：** 成功返回 `struct proc_dir_entry *`，失败返回 `NULL`。

**使用示例：**

```c
static struct proc_dir_entry *my_dir;

static int __init my_init(void)
{
    my_dir = proc_mkdir("my_module", NULL);
    if (!my_dir)
        return -ENOMEM;

    /* 在 my_module 目录下创建文件 */
    proc_create("status", 0444, my_dir, &my_ops);
    return 0;
}

static void __exit my_exit(void)
{
    proc_remove(my_dir); /* 递归删除整个目录 */
}

module_init(my_init);
module_exit(my_exit);
```

---

### 1.4 proc_mkdir_data

在 `/proc` 下创建带私有数据的目录。

```c
struct proc_dir_entry *proc_mkdir_data(
    const char *name,
    umode_t mode,
    struct proc_dir_entry *parent,
    void *data
);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `const char *` | 目录名 |
| `mode` | `umode_t` | 目录权限 |
| `parent` | `struct proc_dir_entry *` | 父目录 |
| `data` | `void *` | 私有数据 |

**返回值：** 成功返回 `struct proc_dir_entry *`，失败返回 `NULL`。

**使用示例：**

```c
struct my_context {
    int id;
    struct mutex lock;
};

static struct my_context ctx = { .id = 1 };

static struct proc_dir_entry *entry;

static int __init my_init(void)
{
    entry = proc_mkdir_data("myctx", 0755, NULL, &ctx);
    if (!entry)
        return -ENOMEM;
    return 0;
}

static void __exit my_exit(void)
{
    proc_remove(entry);
}

module_init(my_init);
module_exit(my_exit);
```

---

### 1.5 proc_remove

删除 `/proc` 条目（递归删除目录）。

```c
void proc_remove(struct proc_dir_entry *de);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `de` | `struct proc_dir_entry *` | 要删除的条目，`NULL` 时安全返回 |

**返回值：** 无。

**使用示例：**

```c
static struct proc_dir_entry *dir;
static struct proc_dir_entry *file;

static int __init my_init(void)
{
    dir  = proc_mkdir("mydir", NULL);
    file = proc_create("info", 0444, dir, &my_ops);
    return 0;
}

static void __exit my_exit(void)
{
    /* 只删除文件 */
    proc_remove(file);

    /* 也可一次性删除整个目录（递归） */
    proc_remove(dir);
}

module_init(my_init);
module_exit(my_exit);
```

---

### 1.6 proc_ops

替代 `file_operations` 用于 `/proc` 文件。内核 5.6+ 推荐使用。

```c
struct proc_ops {
    unsigned int proc_flags;
    int    (*proc_open)(struct inode *inode, struct file *file);
    ssize_t (*proc_read)(struct file *file, char __user *buf,
                         size_t count, loff_t *ppos);
    ssize_t (*proc_write)(struct file *file, const char __user *buf,
                          size_t count, loff_t *ppos);
    loff_t  (*proc_lseek)(struct file *file, loff_t offset, int whence);
    int    (*proc_release)(struct inode *inode, struct file *file);
    __poll_t (*proc_poll)(struct file *file, struct poll_table_struct *wait);
    long   (*proc_ioctl)(struct file *file, unsigned int cmd, unsigned long arg);
    long   (*proc_compat_ioctl)(struct file *file, unsigned int cmd, unsigned long arg);
    int    (*proc_mmap)(struct file *file, struct vm_area_struct *vma);
    unsigned long (*proc_get_unmapped_area)(struct file *file, unsigned long addr,
                                            unsigned long len, unsigned long pgoff,
                                            unsigned long flags);
};
```

**字段说明：**

| 字段 | 说明 |
|------|------|
| `proc_flags` | 标志位，如 `PROC_ENTRY_PERMANENT` |
| `proc_open` | 打开文件时调用 |
| `proc_read` | 读取数据 |
| `proc_write` | 写入数据 |
| `proc_lseek` | 文件偏移定位 |
| `proc_release` | 关闭文件时调用（释放 `proc_open` 分配的资源） |
| `proc_poll` | poll/select 支持 |
| `proc_ioctl` | ioctl 命令处理 |
| `proc_compat_ioctl` | 32 位兼容 ioctl |
| `proc_mmap` | mmap 映射支持 |
| `proc_get_unmapped_area` | 自定义 mmap 地址空间 |

**完整使用示例：**

```c
#include <linux/proc_fs.h>
#include <linux/seq_file.h>

#define MY_BUF_SIZE 4096

static int my_proc_open(struct inode *inode, struct file *file)
{
    /* 使用 seq_file 需要在此调用 seq_open */
    return seq_open(file, &my_seq_ops);
}

static ssize_t my_proc_write(struct file *file,
                             const char __user *buf,
                             size_t count, loff_t *ppos)
{
    char kbuf[64];
    if (copy_from_user(kbuf, buf, min(count, sizeof(kbuf) - 1)))
        return -EFAULT;
    kbuf[min(count, sizeof(kbuf) - 1)] = '\0';
    pr_info("received: %s\n", kbuf);
    return count;
}

static loff_t my_proc_lseek(struct file *file, loff_t offset, int whence)
{
    return default_llseek(file, offset, whence);
}

static int my_proc_release(struct inode *inode, struct file *file)
{
    return seq_release(inode, file);
}

static const struct proc_ops my_proc_ops = {
    .proc_open    = my_proc_open,
    .proc_read    = seq_read,
    .proc_write   = my_proc_write,
    .proc_lseek   = my_proc_lseek,
    .proc_release = my_proc_release,
};
```

---

### 1.7 seq_file 接口

#### seq_open

为 `/proc` 文件初始化 `seq_file`。

```c
int seq_open(struct file *file, const struct seq_operations *ops);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `file` | `struct file *` | 文件对象 |
| `ops` | `const struct seq_operations *` | seq 操作集（show/start/next/stop） |

**返回值：** 成功返回 0，失败返回负错误码。

**seq_operations 结构：**

```c
struct seq_operations {
    void * (*start)(struct seq_file *m, loff_t *pos);
    void   (*stop)(struct seq_file *m, void *v);
    void * (*next)(struct seq_file *m, void *v, loff_t *pos);
    int    (*show)(struct seq_file *m, void *v);
};
```

---

#### seq_close

释放 `seq_file` 资源。

```c
int seq_close(struct file *file);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `file` | `struct file *` | `seq_open` 时使用的文件对象 |

**返回值：** 始终返回 0。

---

#### seq_read

读取 `seq_file` 缓冲区数据到用户空间。

```c
ssize_t seq_read(struct file *file, char __user *buf,
                 size_t count, loff_t *ppos);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `file` | `struct file *` | 文件对象 |
| `buf` | `char __user *` | 用户空间缓冲区 |
| `count` | `size_t` | 要读取的字节数 |
| `ppos` | `loff_t *` | 文件偏移指针 |

**返回值：** 成功返回读取的字节数，返回 0 表示 EOF，负值表示错误。

---

#### seq_write

向 `seq_file` 缓冲区写入数据（在 `show` 回调中可调用）。

```c
ssize_t seq_write(struct file *file, const void __user *buf, size_t count);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `file` | `struct file *` | 文件对象 |
| `buf` | `const void __user *` | 数据源（通常用于内核态） |
| `count` | `size_t` | 写入字节数 |

**返回值：** 成功返回写入的字节数，失败返回负错误码。

---

#### seq_lseek

调整 `seq_file` 读取位置。

```c
loff_t seq_lseek(struct file *file, loff_t offset, int whence);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `file` | `struct file *` | 文件对象 |
| `offset` | `loff_t` | 偏移量 |
| `whence` | `int` | 定位方式：`SEEK_SET`、`SEEK_CUR`、`SEEK_END` |

**返回值：** 新的文件偏移位置。

---

#### seq_printf

格式化输出到 `seq_file` 缓冲区。

```c
void seq_printf(struct seq_file *m, const char *f, ...);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `m` | `struct seq_file *` | seq_file 对象 |
| `f` | `const char *` | printf 格式字符串 |
| `...` | - | 可变参数 |

**返回值：** 无。

**使用示例：**

```c
static int my_show(struct seq_file *m, void *v)
{
    seq_printf(m, "Name: %s\n", "my_module");
    seq_printf(m, "Version: %d.%d\n", 1, 0);
    seq_printf(m, "Value: %d\n", 42);
    return 0;
}
```

---

#### seq_puts

输出字符串到 `seq_file` 缓冲区。

```c
void seq_puts(struct seq_file *m, const char *s);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `m` | `struct seq_file *` | seq_file 对象 |
| `s` | `const char *` | 要输出的字符串 |

**返回值：** 无。

**使用示例：**

```c
static int my_show(struct seq_file *m, void *v)
{
    seq_puts(m, "=== Module Status ===\n");
    seq_puts(m, "Running\n");
    return 0;
}
```

---

#### seq_putc

输出单个字符到 `seq_file` 缓冲区。

```c
void seq_putc(struct seq_file *m, char c);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `m` | `struct seq_file *` | seq_file 对象 |
| `c` | `char` | 要输出的字符 |

**返回值：** 无。

---

#### seq_put_hex

输出十六进制格式到 `seq_file` 缓冲区。

```c
void seq_put_hex(struct seq_file *m, const char *prefix, u64 value, int width);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `m` | `struct seq_file *` | seq_file 对象 |
| `prefix` | `const char *` | 前缀字符串（可为 `NULL`） |
| `value` | `u64` | 要输出的值 |
| `width` | `int` | 输出宽度（0 表示自动） |

**返回值：** 无。

**使用示例：**

```c
static int my_show(struct seq_file *m, void *v)
{
    seq_put_hex(m, "data: ", 0xDEADBEEF, 8);
    /* 输出: data: deadbeef */
    return 0;
}
```

---

#### seq_put_decimal

输出十进制格式到 `seq_file` 缓冲区。

```c
void seq_put_decimal(struct seq_file *m, const char *prefix, u64 value);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `m` | `struct seq_file *` | seq_file 对象 |
| `prefix` | `const char *` | 前缀字符串（可为 `NULL`） |
| `value` | `u64` | 要输出的值 |

**返回值：** 无。

---

#### single_open

简化版 `seq_open`，只需实现一个 `show` 回调。

```c
int single_open(struct file *file, int (*show)(struct seq_file *m, void *p), void *data);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `file` | `struct file *` | 文件对象 |
| `show` | `int (*)(struct seq_file *, void *)` | 展示回调函数 |
| `data` | `void *` | 传递给 `show` 的私有数据 |

**返回值：** 成功返回 0，失败返回负错误码。

---

#### single_release

释放 `single_open` 分配的资源。

```c
int single_release(struct inode *inode, struct file *file);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `inode` | `struct inode *` | inode 对象 |
| `file` | `struct file *` | 文件对象 |

**返回值：** 始终返回 0。

**single_open 完整示例：**

```c
#include <linux/proc_fs.h>
#include <linux/seq_file.h>

static int my_show(struct seq_file *m, void *p)
{
    seq_puts(m, "Hello from /proc/myfile!\n");
    seq_printf(m, "PID: %d\n", current->pid);
    return 0;
}

static ssize_t my_read(struct file *file, char __user *buf,
                       size_t count, loff_t *ppos)
{
    return single_open(file, my_show, NULL);
}

static const struct proc_ops my_proc_ops = {
    .proc_open    = my_read,
    .proc_read    = seq_read,
    .proc_lseek   = seq_lseek,
    .proc_release = single_release,
};

static int __init my_init(void)
{
    proc_create("myfile", 0444, NULL, &my_proc_ops);
    return 0;
}

static void __exit my_exit(void)
{
    remove_proc_entry("myfile", NULL);
}

module_init(my_init);
module_exit(my_exit);
```

---

#### DEFINE_SHOW_ATTRIBUTE

自动生成 `show` 回调所需的 `seq_operations` 和 `open`/`release` 函数。

```c
DEFINE_SHOW_ATTRIBUTE(name);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | 标识符 | 与 `name_show` 函数配合使用 |

**展开后生成：**
- `name_open()` - 调用 `seq_open` 并绑定 `name_fops`
- `name_release()` - 调用 `seq_release`
- `name_fops` - `file_operations` 结构体

**使用示例：**

```c
#include <linux/proc_fs.h>
#include <linux/seq_file.h>

static int mymodule_show(struct seq_file *m, void *v)
{
    seq_printf(m, "Module loaded: yes\n");
    seq_printf(m, "Uptime: %llu\n", ktime_get_boottime_seconds());
    return 0;
}

DEFINE_SHOW_ATTRIBUTE(mymodule);

static int __init my_init(void)
{
    /* mymodule_fops, mymodule_open, mymodule_release 自动定义 */
    proc_create("mymodule", 0444, NULL, &mymodule_fops);
    return 0;
}

static void __exit my_exit(void)
{
    remove_proc_entry("mymodule", NULL);
}

module_init(my_init);
module_exit(my_exit);
```

---

#### DEFINE_SIMPLE_ATTRIBUTE

定义简单的只读 `/proc` 文件，`show` 回调返回格式化字符串。

```c
DEFINE_SIMPLE_ATTRIBUTE(name, get, fmt);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | 标识符 | 函数名前缀 |
| `get` | `int (*)(void *, u64 *)` | 获取值的回调 |
| `fmt` | `const char *` | printf 格式字符串（如 `"%llu\n"`） |

**展开后生成：**
- `name_open()` - 调用 `simple_open`
- `name_release()` - 调用 `single_release`
- `name_fops` - `file_operations` 结构体

**使用示例：**

```c
#include <linux/proc_fs.h>
#include <linux/seq_file.h>

static u64 my_counter = 0;

static int my_get(void *data, u64 *val)
{
    *val = my_counter++;
    return 0;
}

DEFINE_SIMPLE_ATTRIBUTE(my_counter_fops, my_get, "%llu\n");

static int __init my_init(void)
{
    proc_create("mycounter", 0444, NULL, &my_counter_fops);
    return 0;
}

static void __exit my_exit(void)
{
    remove_proc_entry("mycounter", NULL);
}

module_init(my_init);
module_exit(my_exit);
```

---

### 1.8 /proc 目录辅助宏

#### proc_net

创建在 `/proc/net` 目录下的条目。

```c
/* 宏定义（网络子系统专用） */
#define proc_net_create(name, mode, parent) \
    proc_create_data(name, mode, parent, &proc_net_operations, NULL)
```

**使用示例：**

```c
#include <net/net_namespace.h>

static int __init my_net_init(void)
{
    /* 在 /proc/net/ 下创建文件 */
    struct proc_dir_entry *entry;
    entry = proc_create("mynet", 0444,
                        init_net.proc_net, &my_net_ops);
    return entry ? 0 : -ENOMEM;
}

static void __exit my_net_exit(void)
{
    remove_proc_entry("mynet", init_net.proc_net);
}

module_init(my_net_init);
module_exit(my_net_exit);
```

---

## 2. sysfs 接口

### 2.1 kobject, kset, kobj_type

#### struct kobject

sysfs 中的基本对象，对应 `/sys` 中的一个目录。

```c
struct kobject {
    const char        *name;       /* 对象名称 */
    struct list_head  entry;       /* 链表节点 */
    struct kobject    *parent;     /* 父 kobject */
    struct kset       *kset;       /* 所属 kset */
    struct kobj_type  *ktype;      /* 类型信息 */
    struct kernfs_node *sd;        /* sysfs 目录节点 */
    struct kref       kref;        /* 引用计数 */
    ...
};
```

---

#### struct kset

同类 kobject 的集合。

```c
struct kset {
    struct list_head list;            /* kobject 链表 */
    spinlock_t list_lock;             /* 链表锁 */
    struct kobject kobj;              /* 内嵌 kobject */
    const struct kset_uevent_ops *uevent_ops;  /* uevent 操作 */
};
```

---

#### struct kobj_type

描述 kobject 的类型信息。

```c
struct kobj_type {
    void (*release)(struct kobject *kobj);   /* 释放回调 */
    const struct sysfs_ops *sysfs_ops;       /* sysfs 操作 */
    struct attribute **default_attrs;         /* 默认属性 */
    const struct attribute_group **default_groups;
    const struct kobj_ns_type_operations *(*child_ns_type)(struct kobject *kobj);
    const void *(*namespace)(struct kobject *kobj);
};
```

---

### 2.2 kobject 创建与销毁

#### kobject_create_and_add

创建 kobject 并将其添加到 sysfs。

```c
struct kobject *kobject_create_and_add(
    const char *name,
    struct kobject *parent
);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `const char *` | kobject 名称（sysfs 目录名） |
| `parent` | `struct kobject *` | 父 kobject，`NULL` 表示 `/sys` 下直接创建 |

**返回值：** 成功返回 `struct kobject *`，失败返回 `NULL`。

**使用示例：**

```c
#include <linux/kobject.h>
#include <linux/sysfs.h>

static struct kobject *my_kobj;

static ssize_t my_attr_show(struct kobject *kobj,
                            struct kobj_attribute *attr, char *buf)
{
    return sysfs_emit(buf, "Hello from sysfs!\n");
}

static struct kobj_attribute my_attr =
    __ATTR(hello, 0644, my_attr_show, NULL);

static int __init my_init(void)
{
    int error;

    my_kobj = kobject_create_and_add("my_module", NULL);
    if (!my_kobj)
        return -ENOMEM;

    error = sysfs_create_file(my_kobj, &my_attr.attr);
    if (error) {
        kobject_put(my_kobj);
        return error;
    }
    return 0;
}

static void __exit my_exit(void)
{
    kobject_put(my_kobj);
}

module_init(my_init);
module_exit(my_exit);
```

---

#### kobject_put

减少 kobject 引用计数，为零时释放。

```c
void kobject_put(struct kobject *kobj);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `kobj` | `struct kobject *` | kobject 指针 |

**返回值：** 无。

---

#### kobject_init_and_add

初始化 kobject 并添加到 sysfs。

```c
int kobject_init_and_add(
    struct kobject *kobj,
    struct kobj_type *ktype,
    struct kobject *parent,
    const char *fmt, ...
);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `kobj` | `struct kobject *` | 预分配的 kobject |
| `ktype` | `struct kobj_type *` | 类型信息 |
| `parent` | `struct kobject *` | 父 kobject |
| `fmt` | `const char *` | printf 格式（名称） |
| `...` | - | 可变参数 |

**返回值：** 成功返回 0，失败返回负错误码。

**使用示例：**

```c
#include <linux/kobject.h>
#include <linux/string.h>

struct my_obj {
    struct kobject kobj;
    int value;
};

static ssize_t value_show(struct kobject *kobj,
                          struct kobj_attribute *attr, char *buf)
{
    struct my_obj *obj = container_of(kobj, struct my_obj, kobj);
    return sysfs_emit(buf, "%d\n", obj->value);
}

static ssize_t value_store(struct kobject *kobj,
                           struct kobj_attribute *attr,
                           const char *buf, size_t count)
{
    struct my_obj *obj = container_of(kobj, struct my_obj, kobj);
    int ret;

    ret = kstrtoint(buf, 10, &obj->value);
    if (ret)
        return ret;

    return count;
}

static struct kobj_attribute value_attr =
    __ATTR_RW(value);

static void my_obj_release(struct kobject *kobj)
{
    struct my_obj *obj = container_of(kobj, struct my_obj, kobj);
    kfree(obj);
}

static struct kobj_type my_ktype = {
    .release = my_obj_release,
    .sysfs_ops = &kobj_sysfs_ops,
    .default_attrs = (struct attribute *[]) {
        &value_attr.attr,
        NULL,
    },
};

static struct my_obj *my_obj;

static int __init my_init(void)
{
    int error;

    my_obj = kzalloc(sizeof(*my_obj), GFP_KERNEL);
    if (!my_obj)
        return -ENOMEM;

    my_obj->value = 100;

    error = kobject_init_and_add(&my_obj->kobj, &my_ktype,
                                  NULL, "myobj");
    if (error) {
        kobject_put(&my_obj->kobj);
        return error;
    }

    return 0;
}

static void __exit my_exit(void)
{
    kobject_put(&my_obj->kobj);
}

module_init(my_init);
module_exit(my_exit);
```

---

### 2.3 sysfs 文件操作

#### sysfs_create_file

在 kobject 目录下创建属性文件。

```c
int sysfs_create_file(struct kobject *kobj, const struct attribute *attr);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `kobj` | `struct kobject *` | 父 kobject |
| `attr` | `const struct attribute *` | 属性定义 |

**返回值：** 成功返回 0，失败返回负错误码。

---

#### sysfs_remove_file

删除 kobject 目录下的属性文件。

```c
void sysfs_remove_file(struct kobject *kobj, const struct attribute *attr);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `kobj` | `struct kobject *` | 父 kobject |
| `attr` | `const struct attribute *` | 要删除的属性 |

**返回值：** 无。

---

#### sysfs_create_group

创建属性组（批量创建文件）。

```c
int sysfs_create_group(struct kobject *kobj,
                       const struct attribute_group *grp);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `kobj` | `struct kobject *` | 父 kobject |
| `grp` | `const struct attribute_group *` | 属性组 |

**返回值：** 成功返回 0，失败返回负错误码。

---

#### sysfs_remove_group

删除属性组。

```c
void sysfs_remove_group(struct kobject *kobj,
                        const struct attribute_group *grp);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `kobj` | `struct kobject *` | 父 kobject |
| `grp` | `const struct attribute_group *` | 属性组 |

**返回值：** 无。

**sysfs_create_group / sysfs_remove_group 完整示例：**

```c
#include <linux/kobject.h>
#include <linux/sysfs.h>

static ssize_t stat1_show(struct kobject *kobj,
                          struct kobj_attribute *attr, char *buf)
{
    return sysfs_emit(buf, "stat1: 100\n");
}

static ssize_t stat2_show(struct kobject *kobj,
                          struct kobj_attribute *attr, char *buf)
{
    return sysfs_emit(buf, "stat2: 200\n");
}

static struct kobj_attribute stat1_attr =
    __ATTR(stat1, 0444, stat1_show, NULL);
static struct kobj_attribute stat2_attr =
    __ATTR(stat2, 0444, stat2_show, NULL);

static struct attribute *my_attrs[] = {
    &stat1_attr.attr,
    &stat2_attr.attr,
    NULL,
};

static struct attribute_group my_attr_group = {
    .attrs = my_attrs,
};

static struct kobject *my_kobj;

static int __init my_init(void)
{
    int error;

    my_kobj = kobject_create_and_add("my_stats", NULL);
    if (!my_kobj)
        return -ENOMEM;

    /* 一次创建 stat1, stat2 两个文件 */
    error = sysfs_create_group(my_kobj, &my_attr_group);
    if (error) {
        kobject_put(my_kobj);
        return error;
    }
    return 0;
}

static void __exit my_exit(void)
{
    sysfs_remove_group(my_kobj, &my_attr_group);
    kobject_put(my_kobj);
}

module_init(my_init);
module_exit(my_exit);
```

---

#### sysfs_create_bin_group

创建二进制属性组。

```c
int sysfs_create_bin_group(struct kobject *kobj,
                           const char *name, umode_t mode);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `kobj` | `struct kobject *` | 父 kobject |
| `name` | `const char *` | 组名 |
| `mode` | `umode_t` | 目录权限 |

**返回值：** 成功返回 0，失败返回负错误码。

---

#### sysfs_remove_bin_group

删除二进制属性组。

```c
void sysfs_remove_bin_group(struct kobject *kobj, const char *name);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `kobj` | `struct kobject *` | 父 kobject |
| `name` | `const char *` | 组名 |

**返回值：** 无。

**使用示例：**

```c
#include <linux/kobject.h>
#include <linux/sysfs.h>
#include <linux/binfmts.h>

static struct bin_attribute my_bin_attr = {
    .attr = { .name = "data", .mode = 0644 },
    .size = 256,
    .read = my_bin_read,
    .write = my_bin_write,
};

static ssize_t my_bin_read(struct file *file, struct kobject *kobj,
                           struct bin_attribute *bin_attr,
                           char *buf, loff_t off, size_t count)
{
    /* 读取二进制数据 */
    return count;
}

static ssize_t my_bin_write(struct file *file, struct kobject *kobj,
                            struct bin_attribute *bin_attr,
                            char *buf, loff_t off, size_t count)
{
    /* 写入二进制数据 */
    return count;
}

static struct kobject *my_kobj;

static int __init my_init(void)
{
    int error;

    my_kobj = kobject_create_and_add("bindata", NULL);
    if (!my_kobj)
        return -ENOMEM;

    error = sysfs_create_bin_group(my_kobj, "mybins", 0644);
    if (error) {
        kobject_put(my_kobj);
        return error;
    }

    return 0;
}

static void __exit my_exit(void)
{
    sysfs_remove_bin_group(my_kobj, "mybins");
    kobject_put(my_kobj);
}

module_init(my_init);
module_exit(my_exit);
```

---

### 2.4 sysfs 通知

#### sysfs_notify

当 sysfs 属性变化时通知用户空间。

```c
void sysfs_notify(struct kobject *kobj, const char *dir,
                  const char *attr);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `kobj` | `struct kobject *` | 相关的 kobject |
| `dir` | `const char *` | 子目录名（`NULL` 表示 kobject 根目录） |
| `attr` | `const char *` | 属性文件名（`NULL` 表示所有属性） |

**返回值：** 无。

**使用示例：**

```c
#include <linux/kobject.h>
#include <linux/sysfs.h>
#include <linux/poll.h>

/* 在 sysfs_poll 回调中触发通知 */
static ssize_t my_show(struct kobject *kobj,
                       struct kobj_attribute *attr, char *buf)
{
    return sysfs_emit(buf, "%d\n", some_value);
}

static ssize_t my_store(struct kobject *kobj,
                        struct kobj_attribute *attr,
                        const char *buf, size_t count)
{
    int val;
    if (kstrtoint(buf, 10, &val))
        return -EINVAL;
    some_value = val;

    /* 通知用户空间数据已变化 */
    sysfs_notify(kobj, NULL, "myvalue");
    return count;
}

static struct kobj_attribute myvalue_attr =
    __ATTR(myvalue, 0644, my_show, my_store);

/* 用户空间 poll/select 使用示例:
 * pollfd.fd = open("/sys/my_module/myvalue", O_RDONLY);
 * poll(&pollfd, 1, -1);  // 阻塞等待 sysfs_notify
 */
```

---

### 2.5 属性文件结构体

#### struct attribute

sysfs 中的属性定义。

```c
struct attribute {
    const char      *name;   /* 属性文件名 */
    umode_t         mode;    /* 权限 */
};
```

---

#### struct attribute_group

属性组定义，用于批量创建文件。

```c
struct attribute_group {
    const char              *name;    /* 组名（可选） */
    umode_t                 mode;     /* 统一权限 */
    struct attribute        **attrs;  /* 属性数组 */
    struct bin_attribute   **bin_attrs;
    struct attribute_group **is_visible;
};
```

**使用示例：**

```c
static struct attribute *my_attrs[] = {
    &attr1.attr,
    &attr2.attr,
    &attr3.attr,
    NULL,
};

static struct attribute_group my_group = {
    .name = "my_attrs",
    .attrs = my_attrs,
};
```

---

### 2.6 show/store 回调

sysfs 属性的读写回调函数原型。

**show 回调（读取）：**

```c
ssize_t (*show)(struct kobject *kobj,
               struct kobj_attribute *attr, char *buf);
```

**store 回调（写入）：**

```c
ssize_t (*store)(struct kobject *kobj,
                struct kobj_attribute *attr,
                const char *buf, size_t count);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `kobj` | `struct kobject *` | 属性所属的 kobject |
| `attr` | `struct kobj_attribute *` | 属性对象 |
| `buf` | `char *` | 内核缓冲区（show 用） |
| `buf` | `const char *` | 用户输入（store 用） |
| `count` | `size_t` | 输入数据长度 |

**返回值：** `show` 返回写入 `buf` 的字节数，`store` 返回 `count`。

**使用示例：**

```c
#include <linux/kobject.h>
#include <linux/sysfs.h>

struct my_data {
    int enabled;
    int count;
    char name[32];
};

static struct my_data data = {
    .enabled = 1,
    .count   = 0,
    .name    = "default",
};

static struct kobject *my_kobj;

static ssize_t enabled_show(struct kobject *kobj,
                            struct kobj_attribute *attr, char *buf)
{
    return sysfs_emit(buf, "%d\n", data.enabled);
}

static ssize_t enabled_store(struct kobject *kobj,
                             struct kobj_attribute *attr,
                             const char *buf, size_t count)
{
    int val;
    if (kstrtoint(buf, 10, &val))
        return -EINVAL;
    data.enabled = !!val;
    return count;
}

static ssize_t count_show(struct kobject *kobj,
                          struct kobj_attribute *attr, char *buf)
{
    return sysfs_emit(buf, "%d\n", data.count);
}

static ssize_t name_show(struct kobject *kobj,
                         struct kobj_attribute *attr, char *buf)
{
    return sysfs_emit(buf, "%s\n", data.name);
}

static struct kobj_attribute enabled_attr =
    __ATTR(enabled, 0644, enabled_show, enabled_store);
static struct kobj_attribute count_attr =
    __ATTR(count, 0444, count_show, NULL);
static struct kobj_attribute name_attr =
    __ATTR(name, 0444, name_show, NULL);

static struct attribute *my_attrs[] = {
    &enabled_attr.attr,
    &count_attr.attr,
    &name_attr.attr,
    NULL,
};

static struct attribute_group my_attr_group = {
    .attrs = my_attrs,
};

static int __init my_init(void)
{
    int error;

    my_kobj = kobject_create_and_add("mydevice", NULL);
    if (!my_kobj)
        return -ENOMEM;

    error = sysfs_create_group(my_kobj, &my_attr_group);
    if (error) {
        kobject_put(my_kobj);
        return error;
    }
    return 0;
}

static void __exit my_exit(void)
{
    sysfs_remove_group(my_kobj, &my_attr_group);
    kobject_put(my_kobj);
}

module_init(my_init);
module_exit(my_exit);
```

---

### 2.7 宏定义辅助

#### DEVICE_ATTR

定义设备属性。

```c
#define DEVICE_ATTR(_name, _mode, _show, _store) \
    struct device_attribute dev_attr_##_name = __ATTR(_name, _mode, _show, _store)
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `_name` | 属性名 |
| `_mode` | 权限 |
| `_show` | 读回调 |
| `_store` | 写回调 |

**辅助宏：**

```c
#define DEVICE_ATTR_RO(_name)  /* 只读 */
#define DEVICE_ATTR_WO(_name)  /* 只写 */
#define DEVICE_ATTR_RW(_name)  /* 读写 */
```

**使用示例：**

```c
#include <linux/device.h>

static ssize_t led_brightness_show(struct device *dev,
                                   struct device_attribute *attr, char *buf)
{
    return sysfs_emit(buf, "%d\n", current_brightness);
}

static ssize_t led_brightness_store(struct device *dev,
                                    struct device_attribute *attr,
                                    const char *buf, size_t count)
{
    int val;
    if (kstrtoint(buf, 10, &val))
        return -EINVAL;
    current_brightness = val;
    return count;
}

static DEVICE_ATTR_RW(led_brightness);

/* 使用 */
static struct attribute *led_attrs[] = {
    &dev_attr_led_brightness.attr,
    NULL,
};
static struct attribute_group led_attr_group = {
    .attrs = led_attrs,
};
```

---

#### DRIVER_ATTR

定义驱动属性。

```c
#define DRIVER_ATTR(_name, _mode, _show, _store) \
    struct driver_attribute driver_attr_##_name = __ATTR(_name, _mode, _show, _store)
```

**辅助宏：**

```c
#define DRIVER_ATTR_RO(_name)
#define DRIVER_ATTR_WO(_name)
#define DRIVER_ATTR_RW(_name)
```

**使用示例：**

```c
#include <linux/device.h>

static ssize_t driver_info_show(struct device_driver *drv,
                                char *buf)
{
    return sysfs_emit(buf, "Driver: my_driver\nVersion: 1.0\n");
}

static DRIVER_ATTR_RO(driver_info);

static struct attribute *my_driver_attrs[] = {
    &driver_attr_driver_info.attr,
    NULL,
};
ATTRIBUTE_GROUPS(my_driver);

/* 在 driver_register 后通过 sysfs_groups 可见 */
```

---

#### BUS_ATTR

定义总线属性。

```c
#define BUS_ATTR(_name, _mode, _show, _store) \
    struct bus_attribute bus_attr_##_name = __ATTR(_name, _mode, _show, _store)
```

**辅助宏：**

```c
#define BUS_ATTR_RO(_name)
#define BUS_ATTR_WO(_name)
#define BUS_ATTR_RW(_name)
```

**使用示例：**

```c
#include <linux/device.h>

static ssize_t bus_version_show(struct bus_type *bus, char *buf)
{
    return sysfs_emit(buf, "2.0\n");
}

static BUS_ATTR_RO(bus_version);

/* 通过 bus_create_file / bus_remove_file 使用 */
static int __init my_init(void)
{
    return bus_create_file(&my_bus, &bus_attr_bus_version);
}

static void __exit my_exit(void)
{
    bus_remove_file(&my_bus, &bus_attr_bus_version);
}
```

---

#### CLASS_ATTR

定义类属性。

```c
#define CLASS_ATTR(_name, _mode, _show, _store) \
    struct class_attribute class_attr_##_name = __ATTR(_name, _mode, _show, _store)
```

**辅助宏：**

```c
#define CLASS_ATTR_RO(_name)
#define CLASS_ATTR_WO(_name)
#define CLASS_ATTR_RW(_name)
```

**使用示例：**

```c
#include <linux/device.h>

static ssize_t class_info_show(struct class *cls, char *buf)
{
    return sysfs_emit(buf, "My device class\n");
}

static CLASS_ATTR_RO(class_info);

static struct class *my_class;

static int __init my_init(void)
{
    int error;

    my_class = class_create("my_class");
    if (IS_ERR(my_class))
        return PTR_ERR(my_class);

    error = class_create_file(my_class, &class_attr_class_info);
    if (error) {
        class_destroy(my_class);
        return error;
    }
    return 0;
}

static void __exit my_exit(void)
{
    class_remove_file(my_class, &class_attr_class_info);
    class_destroy(my_class);
}

module_init(my_init);
module_exit(my_exit);
```

---

#### kobj_attribute

内核 kobject 属性结构体。

```c
struct kobj_attribute {
    struct attribute attr;
    ssize_t (*show)(struct kobject *kobj,
                    struct kobj_attribute *attr, char *buf);
    ssize_t (*store)(struct kobject *kobj,
                     struct kobj_attribute *attr,
                     const char *buf, size_t count);
};
```

**简化宏：**

```c
#define __ATTR(_name, _mode, _show, _store) {  \
    .attr = { .name = __stringify(_name), .mode = _mode }, \
    .show = _show,                              \
    .store = _store,                            \
}

#define __ATTR_RO(_name) \
    __ATTR(_name, 0444, _name##_show, NULL)

#define __ATTR_WO(_name) \
    __ATTR(_name, 0200, NULL, _name##_store)

#define __ATTR_RW(_name) \
    __ATTR(_name, 0644, _name##_show, _name##_store)
```

**使用示例：**

```c
#include <linux/kobject.h>
#include <linux/sysfs.h>

struct my_device {
    struct kobject kobj;
    int status;
};

static ssize_t status_show(struct kobject *kobj,
                           struct kobj_attribute *attr, char *buf)
{
    struct my_device *dev = container_of(kobj, struct my_device, kobj);
    return sysfs_emit(buf, "%d\n", dev->status);
}

static ssize_t status_store(struct kobject *kobj,
                            struct kobj_attribute *attr,
                            const char *buf, size_t count)
{
    struct my_device *dev = container_of(kobj, struct my_device, kobj);
    int val;
    if (kstrtoint(buf, 10, &val))
        return -EINVAL;
    dev->status = val;
    return count;
}

static struct kobj_attribute status_attr =
    __ATTR(status, 0644, status_show, status_store);
```

---

#### module_attribute

模块属性结构体。

```c
struct module_attribute {
    struct attribute attr;
    ssize_t (*show)(struct module_attribute *attr,
                    struct module_kobject *mk, char *buf);
    ssize_t (*store)(struct module_attribute *attr,
                     struct module_kobject *mk,
                     const char *buf, size_t count);
    int (*setup)(struct module_attribute *attr, const char *buf, char **name);
    int (*test)(struct module_attribute *attr, void *data);
};
```

**使用示例：**

```c
#include <linux/module.h>
#include <linux/moduleparam.h>

static int my_param = 0;
module_param(my_param, int, 0644);
MODULE_PARM_DESC(my_param, "A sample integer parameter");

static char *my_string = "hello";
module_param(my_string, charp, 0644);
MODULE_PARM_DESC(my_string, "A sample string parameter");
```

---

## 3. configfs

### 3.1 configfs 目录操作

#### configfs_create_dir

创建 configfs 目录。

```c
int configfs_create_dir(struct config_item *item);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `item` | `struct config_item *` | configfs item |

**返回值：** 成功返回 0，失败返回负错误码。

---

#### configfs_remove_dir

删除 configfs 目录。

```c
void configfs_remove_dir(struct config_item *item);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `item` | `struct config_item *` | configfs item |

**返回值：** 无。

---

### 3.2 configfs item 操作

#### config_item_init

初始化 configfs item。

```c
void config_item_init(struct config_item *item);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `item` | `struct config_item *` | 待初始化的 item |

**返回值：** 无。

---

#### config_item_put

减少 item 引用计数。

```c
void config_item_put(struct config_item *item);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `item` | `struct config_item *` | configfs item |

**返回值：** 无。

---

#### config_item_init_type_name

初始化 item 并设置类型和名称。

```c
void config_item_init_type_name(struct config_item *item,
                                 const char *name,
                                 struct config_item_type *type);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `item` | `struct config_item *` | 待初始化的 item |
| `name` | `const char *` | item 名称（目录名） |
| `type` | `struct config_item_type *` | item 类型（含 ct_ops 等） |

**返回值：** 无。

---

#### config_group_init

初始化 configfs 组。

```c
void config_group_init(struct config_group *group);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `group` | `struct config_group *` | 待初始化的组 |

**返回值：** 无。

---

#### config_group_init_type_name

初始化组并设置类型和名称。

```c
void config_group_init_type_name(struct config_group *group,
                                  const char *name,
                                  struct config_item_type *type);
```

**参数说明：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `group` | `struct config_group *` | 待初始化的组 |
| `name` | `const char *` | 组名称 |
| `type` | `struct config_item_type *` | 组类型 |

**返回值：** 无。

---

#### configfs 示例

```c
#include <linux/configfs.h>
#include <linux/module.h>

static ssize_t my_item_show(struct config_item *item,
                            char *page)
{
    return sprintf(page, "Hello from configfs!\n");
}

static ssize_t my_item_store(struct config_item *item,
                             const char *page, size_t count)
{
    pr_info("configfs write: %s\n", page);
    return count;
}

static struct configfs_attribute my_item_attr = {
    .ca_name = "myattr",
    .ca_mode = 0644,
    .ca_show = my_item_show,
    .ca_store = my_item_store,
};

static struct configfs_attribute *my_item_attrs[] = {
    &my_item_attr,
    NULL,
};

static struct config_item_type my_item_type = {
    .ct_owner   = THIS_MODULE,
    .ct_attrs   = my_item_attrs,
};

static struct configfs_subsystem my_subsys = {
    .su_group = {
        .cg_item = {
            .ci_namebuf = "my_subsystem",
            .ci_type    = &my_subsys_type,
        },
    },
};

static struct config_group my_group;

static struct config_item_type my_group_type = {
    .ct_owner   = THIS_MODULE,
    .ct_group_ops = &my_group_ops,
};

static int __init my_init(void)
{
    int error;

    /* 初始化子系统 */
    config_group_init(&my_subsys.su_group);
    mutex_init(&my_subsys.su_mutex);
    list_add(&my_subsys.su_group.cg_item.ci_entry,
             &configfs_subsystem_list);

    /* 初始化组 */
    config_group_init_type_name(&my_group, "my_group", &my_group_type);

    return 0;
}

static void __exit my_exit(void)
{
    /* 清理资源 */
}

module_init(my_init);
module_exit(my_exit);
MODULE_LICENSE("GPL");
```

---

## 附录：常用宏速查

| 宏 | 说明 |
|----|------|
| `__ATTR(name, mode, show, store)` | 定义 `kobj_attribute` |
| `__ATTR_RO(name)` | 只读属性 |
| `__ATTR_WO(name)` | 只写属性 |
| `__ATTR_RW(name)` | 读写属性 |
| `DEVICE_ATTR(name, mode, show, store)` | 设备属性 |
| `DEVICE_ATTR_RO(name)` | 设备只读属性 |
| `DEVICE_ATTR_WO(name)` | 设备只写属性 |
| `DEVICE_ATTR_RW(name)` | 设备读写属性 |
| `DRIVER_ATTR(name, mode, show, store)` | 驱动属性 |
| `BUS_ATTR(name, mode, show, store)` | 总线属性 |
| `CLASS_ATTR(name, mode, show, store)` | 类属性 |
| `DEFINE_SHOW_ATTRIBUTE(name)` | 自动生成 seq_operations |
| `DEFINE_SIMPLE_ATTRIBUTE(name, get, fmt)` | 简单 proc 文件 |
| `sysfs_emit(buf, fmt, ...)` | 安全地写入 sysfs 缓冲区 |
| `PDE_DATA(inode)` | 获取 `/proc` 文件的私有数据 |
| `container_of(ptr, type, member)` | 从成员指针获取容器指针 |
