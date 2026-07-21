# 杂项 API

## 目录

1. [时间相关](#1-时间相关)
2. [错误处理](#2-错误处理)
3. [模块相关](#3-模块相关)
4. [位掩码](#4-位掩码)
5. [对齐](#5-对齐)
6. [编译器属性](#6-编译器属性)
7. [类型安全 min/max](#7-类型安全-minmax)
8. [链表](#8-链表)
9. [红黑树](#9-红黑树)
10. [XArray](#10-xarray)
11. [内核通知链](#11-内核通知链)
12. [内核日志/着色输出](#12-内核日志着色输出)

---

## 1. 时间相关

### 头文件

```c
#include <linux/jiffies.h>      // jiffies 相关
#include <linux/ktime.h>        // 高精度时间
#include <linux/time.h>         // 时间结构体
```

---

### jiffies

全局变量，记录系统自启动以来的时钟中断次数。每次时钟中断（通常 1ms 或 10ms）递增一次。

```c
extern unsigned long volatile jiffies;
```

| 类型 | 说明 |
|------|------|
| `unsigned long volatile` | 自系统启动以来的时钟中断次数 |

**使用示例：**

```c
unsigned long start_jiffies = jiffies;
/* 执行一些操作 */
unsigned long elapsed = jiffies - start_jiffies;
printk("Elapsed: %lu jiffies\n", elapsed);
```

---

### msecs_to_jiffies / jiffies_to_msecs

毫秒与 jiffies 之间的转换。

```c
unsigned long msecs_to_jiffies(const unsigned int m);
unsigned int jiffies_to_msecs(const unsigned long j);
```

| 参数 | 说明 |
|------|------|
| `m` | 毫秒数 |
| `j` | jiffies 值 |

| 返回值 | 说明 |
|--------|------|
| `msecs_to_jiffies` | 对应的 jiffies 值 |
| `jiffies_to_msecs` | 对应的毫秒数 |

**使用示例：**

```c
/* 等待 100 毫秒 */
unsigned long timeout = msecs_to_jiffies(100);
unsigned long start = jiffies;

while (time_before(jiffies, start + timeout)) {
    /* 等待 */
}

/* 将 jiffies 转换为毫秒显示 */
unsigned long now = jiffies;
printk("Elapsed: %u ms\n", jiffies_to_msecs(now - start));
```

---

### time_after / time_before

比较两个 jiffies 值，处理溢出情况。

```c
#define time_after(a, b)   \
    (typecheck(unsigned long, a) && \
     typecheck(unsigned long, b) && \
     ((long)((b) - (a)) < 0))

#define time_before(a, b)  time_after(b, a)
```

| 参数 | 说明 |
|------|------|
| `a`, `b` | 要比较的 jiffies 值 |

| 返回值 | 说明 |
|--------|------|
| `int` | `time_after(a, b)`: a 晚于 b 返回真；`time_before(a, b)`: a 早于 b 返回真 |

**使用示例：**

```c
unsigned long timeout = jiffies + msecs_to_jiffies(500);

/* 等待直到超时 */
while (time_before(jiffies, timeout)) {
    /* 等待 */
}

/* 检查是否超时 */
if (time_after(jiffies, timeout)) {
    printk("Timeout!\n");
}
```

---

### ktime_get

获取当前的高精度时间（纳秒精度），推荐使用。

```c
ktime_t ktime_get(void);
```

| 返回值 | 说明 |
|--------|------|
| `ktime_t` | 当前时间，类型为 `ktime_t`（64 位纳秒） |

**使用示例：**

```c
#include <linux/ktime.h>

ktime_t start = ktime_get();
/* 执行一些操作 */
ktime_t end = ktime_get();

s64 elapsed_ns = ktime_to_ns(ktime_sub(end, start));
printk("Elapsed: %lld ns\n", elapsed_ns);
```

---

## 2. 错误处理

### 头文件

```c
#include <linux/err.h>      // 错误指针处理
```

---

### IS_ERR / PTR_ERR / ERR_PTR

内核中的错误指针机制：用指针的高位表示错误码，区分有效指针和错误指针。

```c
static inline bool IS_ERR(const void *ptr);
static inline long PTR_ERR(const void *ptr);
static inline void *ERR_PTR(long error);
```

| 参数 | 说明 |
|------|------|
| `ptr` | 要检查的指针 |
| `error` | 错误码（负数，如 `-ENOMEM`） |

| 返回值 | 说明 |
|--------|------|
| `IS_ERR` | `true` 表示是错误指针，`false` 表示是有效指针（或 NULL） |
| `PTR_ERR` | 从错误指针中提取的错误码 |
| `ERR_PTR` | 将错误码包装成错误指针 |

**使用示例：**

```c
#include <linux/err.h>

struct device *find_device(int id)
{
    struct device *dev;

    dev = allocate_device(id);
    if (!dev)
        return ERR_PTR(-ENOMEM);  /* 返回错误指针 */

    return dev;  /* 返回有效指针 */
}

void use_device(void)
{
    struct device *dev = find_device(1);

    if (IS_ERR(dev)) {
        long err = PTR_ERR(dev);
        printk("Failed to find device: %ld\n", err);
        return;
    }

    /* 使用 dev */
    /* ... */
    free_device(dev);
}
```

---

### ERR_CAST

将错误指针转换为指定类型，用于消除类型警告。

```c
static inline void *ERR_CAST(const void *ptr);
```

| 参数 | 说明 |
|------|------|
| `ptr` | 错误指针 |

| 返回值 | 说明 |
|--------|------|
| `void *` | 转换后的错误指针 |

**使用示例：**

```c
struct child *get_child(void)
{
    struct parent *p = get_parent();
    if (IS_ERR(p))
        return ERR_CAST(p);  /* 安全地转换类型 */
    return p->child;
}
```

---

### IS_ERR_OR_NULL / IS_ERR_VALUE

增强版错误检查。

```c
static inline bool IS_ERR_OR_NULL(const void *ptr);
static inline bool IS_ERR_VALUE(unsigned long val);
```

| 参数 | 说明 |
|------|------|
| `ptr` | 要检查的指针 |
| `val` | 要检查的值 |

| 返回值 | 说明 |
|--------|------|
| `IS_ERR_OR_NULL` | 指针为 NULL 或错误指针时返回 `true` |
| `IS_ERR_VALUE` | 值是错误指针时返回 `true` |

**使用示例：**

```c
struct obj *get_obj(void)
{
    struct obj *obj = lookup_object();
    if (IS_ERR_OR_NULL(obj)) {
        /* obj 可能是 NULL 或错误指针 */
        return NULL;
    }
    return obj;
}
```

---

## 3. 模块相关

### 头文件

```c
#include <linux/module.h>    // 模块基础设施
```

---

### module_init / module_exit

注册模块的初始化函数和清理函数。

```c
#define module_init(initfunc)
#define module_exit(exitfunc)
```

| 参数 | 说明 |
|------|------|
| `initfunc` | 模块加载时调用的初始化函数 |
| `exitfunc` | 模块卸载时调用的清理函数 |

**使用示例：**

```c
#include <linux/module.h>

static int __init my_module_init(void)
{
    printk(KERN_INFO "Module loaded\n");
    return 0;
}

static void __exit my_module_exit(void)
{
    printk(KERN_INFO "Module unloaded\n");
}

module_init(my_module_init);
module_exit(my_module_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Author");
MODULE_DESCRIPTION("A simple module");
```

---

### THIS_MODULE

表示当前模块的 `struct module` 指针。

```c
#define THIS_MODULE  (&__this_module)
```

**使用示例：**

```c
#include <linux/module.h>

static struct file_operations my_fops = {
    .owner = THIS_MODULE,
    .open  = my_open,
    .release = my_release,
};
```

---

### MODULE_LICENSE / MODULE_AUTHOR / MODULE_DESCRIPTION / MODULE_VERSION

模块元数据宏。

```c
#define MODULE_LICENSE(license)
#define MODULE_AUTHOR(author)
#define MODULE_DESCRIPTION(description)
#define MODULE_VERSION(version)
```

| 参数 | 说明 |
|------|------|
| `license` | 许可证字符串，如 `"GPL"`, `"GPL v2"`, `"MIT"` |
| `author` | 作者名 |
| `description` | 模块描述 |
| `version` | 版本号字符串 |

**使用示例：**

```c
MODULE_LICENSE("GPL v2");
MODULE_AUTHOR("John Doe");
MODULE_DESCRIPTION("Example kernel module");
MODULE_VERSION("1.0.0");
```

---

### module_param

定义模块参数，可在加载时通过命令行或 `/sys/module/<mod>/parameters/` 传递。

```c
#define module_param(name, type, perm)
#define module_param_array(name, type, nump, perm)
```

| 参数 | 说明 |
|------|------|
| `name` | 参数名 |
| `type` | 类型：`bool`, `int`, `uint`, `charp`（字符串指针）, `long`, `short`, `byte`, `ushort`, `ulong`, `ullong` |
| `perm` | 权限，如 `0644`（用户可读写，组和其他可读） |
| `nump` | （仅数组）存储数组元素个数的指针 |

**使用示例：**

```c
#include <linux/module.h>

static int my_value = 42;
static char *my_name = "default";
static int my_array[4];
static int my_array_size;

module_param(my_value, int, 0644);
MODULE_PARM_DESC(my_value, "An integer parameter");

module_param(my_name, charp, 0644);
MODULE_PARM_DESC(my_name, "A string parameter");

module_param_array(my_array, int, &my_array_size, 0644);
MODULE_PARM_DESC(my_array, "An array of integers");

static int __init my_init(void)
{
    printk(KERN_INFO "value=%d, name=%s, array_size=%d\n",
           my_value, my_name, my_array_size);
    return 0;
}

module_init(my_init);
MODULE_LICENSE("GPL");
```

---

### EXPORT_SYMBOL / EXPORT_SYMBOL_GPL

导出符号，允许其他模块使用。

```c
#define EXPORT_SYMBOL(symbol)
#define EXPORT_SYMBOL_GPL(symbol)
```

| 参数 | 说明 |
|------|------|
| `symbol` | 要导出的函数或全局变量 |

| 说明 | |
|------|------|
| `EXPORT_SYMBOL` | 所有模块可使用 |
| `EXPORT_SYMBOL_GPL` | 仅 GPL 兼容模块可使用 |

**使用示例：**

```c
#include <linux/module.h>

int my_helper_function(int x)
{
    return x * 2;
}
EXPORT_SYMBOL(my_helper_function);      /* 所有模块可用 */

void my_gpl_function(void)
{
    /* ... */
}
EXPORT_SYMBOL_GPL(my_gpl_function);    /* 仅 GPL 模块可用 */

MODULE_LICENSE("GPL");
```

---

## 4. 位掩码

### 头文件

```c
#include <linux/bitops.h>     // 位操作
#include <linux/bitmap.h>     // 位图操作
```

---

### BIT / _BIT / BIT_ULL

定义单个位掩码。

```c
#define BIT(nr)           (1UL << (nr))
#define _BIT(nr)          (1UL << (nr))   /* 等同于 BIT */
#define BIT_ULL(nr)       (1ULL << (nr))
```

| 参数 | 说明 |
|------|------|
| `nr` | 位号（从 0 开始） |

**使用示例：**

```c
#define FLAG_READ   BIT(0)    /* 0x0001 */
#define FLAG_WRITE  BIT(1)    /* 0x0002 */
#define FLAG_EXEC   BIT(2)    /* 0x0004 */

unsigned long flags = FLAG_READ | FLAG_WRITE;

if (flags & FLAG_READ) {
    printk("Read flag is set\n");
}
```

---

### GENMASK / GENMASK_ULL

生成连续位范围的掩码。

```c
#define GENMASK(h, l)      (((~0UL) - (1UL << (l)) + 1) & (~0UL << (h)))
#define GENMASK_ULL(h, l)  (((~0ULL) - (1ULL << (l)) + 1) & (~0ULL << (h)))
```

| 参数 | 说明 |
|------|------|
| `h` | 最高位号（包含） |
| `l` | 最低位号（包含） |

**使用示例：**

```c
#define MASK_LOW_4   GENMASK(3, 0)     /* 0x000F */
#define MASK_HIGH_4  GENMASK(7, 4)     /* 0x00F0 */

unsigned long val = 0xFF;
unsigned long low = val & MASK_LOW_4;   /* 0x0F */
unsigned long high = (val & MASK_HIGH_4) >> 4;  /* 0x0F */
```

---

### BIT_MASK / BIT_WORD

计算位掩码和位所在的字。

```c
#define BIT_MASK(nr)    (1UL << ((nr) % BITS_PER_LONG))
#define BIT_WORD(nr)    ((nr) / BITS_PER_LONG)
```

| 参数 | 说明 |
|------|------|
| `nr` | 位号 |

**使用示例：**

```c
unsigned long bitmap[4]; /* 4 * BITS_PER_LONG 位 */

int bit_nr = 65;
unsigned long mask = BIT_MASK(bit_nr);    /* 在字中的位置 */
int word = BIT_WORD(bit_nr);              /* 所在的字索引 */

bitmap[word] |= mask;  /* 设置第 65 位 */
```

---

### for_each_set_bit

遍历位图中所有置位的位。

```c
#define for_each_set_bit(bit, addr, size) \
    for ((bit) = find_first_bit((addr), (size)); \
         (bit) < (size); \
         (bit) = find_next_bit((addr), (size), (bit) + 1))
```

| 参数 | 说明 |
|------|------|
| `bit` | `unsigned int` 类型变量，当前遍历到的位号 |
| `addr` | 位图起始地址（`unsigned long *`） |
| `size` | 位图的位数 |

**使用示例：**

```c
unsigned long bitmap = 0x0D; /* 二进制: 1101 */

int bit;
for_each_set_bit(bit, &bitmap, BITS_PER_LONG) {
    printk("Bit %d is set\n", bit);
}
/* 输出: Bit 0, 2, 3 */
```

---

## 5. 对齐

### 头文件

```c
#include <linux/kernel.h>     // 基础宏
#include <linux/module.h>     // ARRAY_SIZE
```

---

### ALIGN

将值向上对齐到指定边界（必须是 2 的幂）。

```c
#define ALIGN(x, a)     __ALIGN_KERNEL(x, a)
```

| 参数 | 说明 |
|------|------|
| `x` | 要对齐的值 |
| `a` | 对齐边界（2 的幂） |

**使用示例：**

```c
/* 对齐到 4 字节边界 */
size_t size = 13;
size_t aligned = ALIGN(size, 4);  /* 结果: 16 */

/* 对齐到页边界 */
size_t page_size = 4096;
size_t offset = 100;
size_t aligned_offset = ALIGN(offset, page_size);  /* 结果: 4096 */
```

---

### __ALIGN_MASK

带掩码的对齐宏，用于更精确的对齐控制。

```c
#define __ALIGN_MASK(x, mask)  (((x) + (mask)) & ~(mask))
```

| 参数 | 说明 |
|------|------|
| `x` | 要对齐的值 |
| `mask` | 对齐掩码（边界 - 1） |

**使用示例：**

```c
/* 对齐到 32 字节边界 */
size_t x = 17;
size_t mask = 31;  /* 32 - 1 */
size_t aligned = __ALIGN_MASK(x, mask);  /* 结果: 32 */
```

---

### ARRAY_SIZE

获取数组元素个数。

```c
#define ARRAY_SIZE(arr) (sizeof(arr) / sizeof((arr)[0]))
```

| 参数 | 说明 |
|------|------|
| `arr` | 数组名 |

**使用示例：**

```c
int my_array[] = {1, 2, 3, 4, 5};

int count = ARRAY_SIZE(my_array);  /* 结果: 5 */

for (int i = 0; i < ARRAY_SIZE(my_array); i++) {
    printk("Element %d: %d\n", i, my_array[i]);
}
```

---

## 6. 编译器属性

### 头文件

```c
#include <linux/compiler.h>     // 编译器属性
#include <linux/compiler_types.h> // 类型定义
```

---

### __init / __exit

标记函数在特定阶段使用，之后可释放内存。

```c
#define __init      __section(".init.text")
#define __exit      __section(".exit.text")
```

| 说明 | |
|------|------|
| `__init` | 初始化函数，模块加载后可释放内存 |
| `__exit` | 清理函数，静态编译时可丢弃 |

**使用示例：**

```c
static int __init my_init(void)
{
    printk(KERN_INFO "Module initialized\n");
    return 0;
}

static void __exit my_exit(void)
{
    printk(KERN_INFO "Module cleaned up\n");
}

module_init(my_init);
module_exit(my_exit);
```

---

### __read_mostly

标记变量为频繁读取，放入专用缓存行。

```c
#define __read_mostly __section(".data..read_mostly")
```

**使用示例：**

```c
static int __read_mostly my_config_value = 100;
```

---

### __percpu / __rcu / __force / __user / __iomem

地址空间标注宏，用于稀疏类型检查。

```c
#define __percpu    __attribute__((noderef, address_space(1)))
#define __rcu       __attribute__((noderef, address_space(3)))
#define __force     __attribute__((force))
#define __user      __attribute__((noderef, address_space(__user)))
#define __iomem     __attribute__((noderef, address_space(__iomem)))
```

| 说明 | |
|------|------|
| `__percpu` | Per-CPU 变量 |
| `__rcu` | RCU 保护的指针 |
| `__force` | 强制类型转换（忽略稀疏警告） |
| `__user` | 用户空间指针 |
| `__iomem` | I/O 内存映射指针 |

**使用示例：**

```c
/* percpu 变量 */
static int __percpu *my_percpu_counter;

/* 用户空间指针 */
static long my_ioctl(struct file *file, unsigned int cmd, unsigned long arg)
{
    void __user *uarg = (void __user *)arg;
    /* 使用 copy_from_user / copy_to_user 访问 */
}

/* RCU 指针 */
struct my_struct __rcu *global_ptr;
```

---

### __must_check

标记函数返回值必须检查。

```c
#define __must_check  __attribute__((warn_unused_result))
```

**使用示例：**

```c
int __must_check allocate_resource(void);
/* 调用者必须检查返回值，否则编译器会产生警告 */
```

---

### __packed / __aligned

控制结构体的打包和对齐。

```c
#define __packed    __attribute__((packed))
#define __aligned(x) __attribute__((aligned(x)))
```

**使用示例：**

```c
struct __packed my_packed_struct {
    char a;
    int b;
    short c;
};  /* 无填充，大小为 7 字节 */

struct __aligned(16) my_aligned_struct {
    int x;
    int y;
};  /* 16 字节对齐 */
```

---

### likely / unlikely

分支预测提示。

```c
#define likely(x)   __builtin_expect(!!(x), 1)
#define unlikely(x) __builtin_expect(!!(x), 0)
```

| 参数 | 说明 |
|------|------|
| `x` | 条件表达式 |

**使用示例：**

```c
if (likely(ptr != NULL)) {
    /* 大多数情况下会执行这里 */
    process(ptr);
} else {
    /* 少数情况：错误处理 */
    return -EINVAL;
}

if (unlikely(error)) {
    /* 少数情况：错误处理 */
    printk(KERN_ERR "Error occurred\n");
}
```

---

### __attribute__

GCC 属性扩展，内核中常用。

```c
#define __attribute__(x)  __attribute__(x)
```

**使用示例：**

```c
/* 格式化字符串检查 */
void my_printk(const char *fmt, ...)
    __attribute__((format(printf, 1, 2)));

/* 不返回的函数 */
void die(const char *fmt, ...)
    __attribute__((noreturn));

/* 废弃函数警告 */
void old_function(void) __attribute__((deprecated));
```

---

## 7. 类型安全 min/max

### 头文件

```c
#include <linux/kernel.h>
```

---

### min_t / max_t

类型安全的最小值/最大值宏。

```c
#define min_t(type, x, y)   ({      \
    type __min1 = (x);              \
    type __min2 = (y);              \
    __min1 < __min2 ? __min1 : __min2; })

#define max_t(type, x, y)   ({      \
    type __max1 = (x);              \
    type __max2 = (y);              \
    __max1 > __max2 ? __max1 : __max2; })
```

| 参数 | 说明 |
|------|------|
| `type` | 目标类型 |
| `x`, `y` | 要比较的值 |

**使用示例：**

```c
int a = 5, b = 10;
unsigned int result = max_t(unsigned int, a, b);  /* 10 */

size_t size1 = 100, size2 = 200;
size_t min_size = min_t(size_t, size1, size2);   /* 100 */
```

---

### clamp / clamp_t

将值限制在指定范围内。

```c
#define clamp(val, min, max) ({     \
    typeof(val) __val = (val);      \
    typeof(min) __min = (min);      \
    typeof(max) __max = (max);      \
    __val > __max ? __max : __val < __min ? __min : __val; })

#define clamp_t(type, val, min, max) ({ \
    type __val = (type)(val);          \
    type __min = (type)(min);          \
    type __max = (type)(max);          \
    __val > __max ? __max : __val < __min ? __min : __val; })
```

| 参数 | 说明 |
|------|------|
| `val` | 要限制的值 |
| `min` | 最小值 |
| `max` | 最大值 |

**使用示例：**

```c
int value = 150;

/* 将 value 限制在 0-100 范围内 */
int clamped = clamp(value, 0, 100);  /* 结果: 100 */

/* 类型安全版本 */
unsigned int size = 50;
unsigned int clamped_size = clamp_t(unsigned int, size, 10, 100);  /* 结果: 50 */
```

---

## 8. 链表

### 头文件

```c
#include <linux/list.h>      // 链表操作
```

---

### list_head / LIST_HEAD / INIT_LIST_HEAD

链表头定义和初始化。

```c
struct list_head {
    struct list_head *next, *prev;
};

#define LIST_HEAD(name) \
    struct list_head name = LIST_HEAD_INIT(name)

#define INIT_LIST_HEAD(ptr) \
    do { \
        (ptr)->next = (ptr); (ptr)->prev = (ptr); \
    } while (0)
```

**使用示例：**

```c
#include <linux/list.h>

/* 静态初始化 */
LIST_HEAD(my_list);

/* 动态初始化 */
struct list_head my_list2;
INIT_LIST_HEAD(&my_list2);
```

---

### list_add / list_add_tail

在链表中插入节点。

```c
void list_add(struct list_head *new, struct list_head *head);
void list_add_tail(struct list_head *new, struct list_head *head);
```

| 参数 | 说明 |
|------|------|
| `new` | 新节点 |
| `head` | 链表头 |

| 说明 | |
|------|------|
| `list_add` | 在 head 后面插入（栈/头插法） |
| `list_add_tail` | 在 head 前面插入（队列/尾插法） |

**使用示例：**

```c
struct my_item {
    int data;
    struct list_head list;
};

struct my_item item1, item2, item3;

list_add(&item1.list, &my_list);
list_add(&item2.list, &my_list);
list_add_tail(&item3.list, &my_list);
/* 链表顺序: my_list -> item2 -> item1 -> item3 -> my_list */
```

---

### list_del / list_move

删除和移动链表节点。

```c
void list_del(struct list_head *entry);
void list_move(struct list_head *list, struct list_head *head);
```

| 参数 | 说明 |
|------|------|
| `entry` | 要删除的节点 |
| `list` | 要移动的节点 |
| `head` | 新的位置 |

**使用示例：**

```c
/* 删除节点 */
list_del(&item1.list);

/* 移动节点到新位置 */
list_move(&item2.list, &my_list);
```

---

### list_empty

检查链表是否为空。

```c
int list_empty(const struct list_head *head);
```

| 参数 | 说明 |
|------|------|
| `head` | 链表头 |

| 返回值 | 说明 |
|--------|------|
| `int` | 非零表示链表为空 |

**使用示例：**

```c
if (list_empty(&my_list)) {
    printk("List is empty\n");
}
```

---

### list_for_each / list_for_each_safe

遍历链表。

```c
#define list_for_each(pos, head) \
    for (pos = (head)->next; pos != (head); pos = pos->next)

#define list_for_each_safe(pos, n, head) \
    for (pos = (head)->next, n = pos->next; pos != (head); \
        pos = n, n = pos->next)
```

| 参数 | 说明 |
|------|------|
| `pos` | `struct list_head *` 类型，当前遍历指针 |
| `n` | `struct list_head *` 类型，临时变量（仅 safe 版本） |
| `head` | 链表头 |

**使用示例：**

```c
struct list_head *pos;

/* 安全遍历（允许删除节点） */
list_for_each_safe(pos, tmp, &my_list) {
    struct my_item *item = list_entry(pos, struct my_item, list);
    if (item->data == 0) {
        list_del(pos);
        kfree(item);
    }
}
```

---

### list_for_each_entry / list_for_each_entry_safe

遍历包含链表的结构体。

```c
#define list_for_each_entry(pos, head, member) \
    for (pos = list_first_entry(head, typeof(*pos), member); \
         &pos->member != (head); \
         pos = list_next_entry(pos, member))

#define list_for_each_entry_safe(pos, n, head, member) \
    for (pos = list_first_entry(head, typeof(*pos), member), \
        n = list_next_entry(pos, member); \
         &pos->member != (head); \
         pos = n, n = list_next_entry(n, member))
```

| 参数 | 说明 |
|------|------|
| `pos` | 结构体指针 |
| `head` | 链表头 |
| `member` | 结构体中 `list_head` 成员名 |

**使用示例：**

```c
struct my_item {
    int data;
    struct list_head list;
};

struct my_item *item;

list_for_each_entry(item, &my_list, list) {
    printk("Data: %d\n", item->data);
}

/* 安全遍历 */
list_for_each_entry_safe(item, tmp, &my_list, list) {
    if (item->data == 0) {
        list_del(&item->list);
        kfree(item);
    }
}
```

---

### list_entry / container_of

从链表节点获取包含它的结构体。

```c
#define list_entry(ptr, type, member) \
    container_of(ptr, type, member)

#define container_of(ptr, type, member) ({ \
    const typeof(((type *)0)->member) *__mptr = (ptr); \
    (type *)((char *)__mptr - offsetof(type, member)); })
```

| 参数 | 说明 |
|------|------|
| `ptr` | `list_head` 指针 |
| `type` | 包含结构体类型 |
| `member` | 结构体中 `list_head` 成员名 |

**使用示例：**

```c
struct my_item {
    int data;
    struct list_head list;
};

struct list_head *pos = &some_item.list;
struct my_item *item = list_entry(pos, struct my_item, list);
```

---

## 9. 红黑树

### 头文件

```c
#include <linux/rbtree.h>     // 红黑树
```

---

### rb_root / rb_node / RB_ROOT

红黑树节点和根定义。

```c
struct rb_root {
    struct rb_node *rb_node;
};

struct rb_node {
    unsigned long  __rb_parent_color;
    struct rb_node *rb_right;
    struct rb_node *rb_left;
};

#define RB_ROOT  (struct rb_root) { NULL, }
```

**使用示例：**

```c
#include <linux/rbtree.h>

struct my_node {
    int key;
    struct rb_node node;
};

struct rb_root my_tree = RB_ROOT;
```

---

### rb_link_node / rb_insert_color

插入节点。

```c
void rb_link_node(struct rb_node *node, struct rb_node *parent,
                  struct rb_node **rb_link);
void rb_insert_color(struct rb_node *node, struct rb_root *root);
```

| 参数 | 说明 |
|------|------|
| `node` | 要插入的节点 |
| `parent` | 父节点 |
| `rb_link` | 指向父节点左/右指针的指针 |
| `root` | 红黑树根 |

**使用示例：**

```c
void insert_node(struct rb_root *root, struct my_node *new)
{
    struct rb_node **link = &root->rb_node;
    struct rb_node *parent = NULL;

    /* 查找插入位置 */
    while (*link) {
        parent = *link;
        if (new->key < rb_entry(parent, struct my_node, node)->key)
            link = &(*link)->rb_left;
        else
            link = &(*link)->rb_right;
    }

    /* 链接节点 */
    rb_link_node(&new->node, parent, link);
    rb_insert_color(&new->node, root);
}
```

---

### rb_erase

删除节点。

```c
void rb_erase(struct rb_node *node, struct rb_root *root);
```

| 参数 | 说明 |
|------|------|
| `node` | 要删除的节点 |
| `root` | 红黑树根 |

**使用示例：**

```c
void erase_node(struct rb_root *root, struct my_node *target)
{
    rb_erase(&target->node, root);
    kfree(target);
}
```

---

### rb_first / rb_next

遍历红黑树。

```c
struct rb_node *rb_first(const struct rb_root *root);
struct rb_node *rb_next(const struct rb_node *node);
```

| 返回值 | 说明 |
|--------|------|
| `rb_first` | 最小节点，树为空时返回 NULL |
| `rb_next` | 下一个节点，已是最后一个时返回 NULL |

**使用示例：**

```c
struct rb_node *node;

for (node = rb_first(&my_tree); node; node = rb_next(node)) {
    struct my_item *item = rb_entry(node, struct my_item, node);
    printk("Key: %d\n", item->key);
}
```

---

### rb_replace_node

替换节点。

```c
void rb_replace_node(struct rb_node *old, struct rb_node *new,
                     struct rb_root *root);
```

| 参数 | 说明 |
|------|------|
| `old` | 旧节点 |
| `new` | 新节点 |
| `root` | 红黑树根 |

**使用示例：**

```c
void replace_node(struct rb_root *root, struct my_node *old,
                  struct my_node *new)
{
    rb_replace_node(&old->node, &new->node, root);
    kfree(old);
}
```

---

### rb_entry

从红黑树节点获取包含它的结构体。

```c
#define rb_entry(ptr, type, member) \
    container_of(ptr, type, member)
```

**使用示例：**

```c
struct rb_node *node = &some_node->node;
struct my_node *my = rb_entry(node, struct my_node, node);
```

---

## 10. XArray

### 头文件

```c
#include <linux/xarray.h>     // XArray
```

---

### xa_init

初始化 XArray。

```c
#define xa_init(name)  xa_init_flags(name, 0)
```

| 参数 | 说明 |
|------|------|
| `name` | XArray 变量名 |

**使用示例：**

```c
#include <linux/xarray.h>

DEFINE_XARRAY(my_xa);    /* 静态定义并初始化 */
/* 或 */
struct xarray xa;
xa_init(&xa);            /* 动态初始化 */
```

---

### xa_store / xa_load / xa_erase

存储、加载、删除元素。

```c
int xa_store(struct xarray *xa, unsigned long index, void *entry, gfp_t gfp);
void *xa_load(struct xarray *xa, unsigned long index);
void *xa_erase(struct xarray *xa, unsigned long index);
```

| 参数 | 说明 |
|------|------|
| `xa` | XArray 指针 |
| `index` | 索引 |
| `entry` | 要存储的指针 |
| `gfp` | 内存分配标志 |

| 返回值 | 说明 |
|--------|------|
| `xa_store` | 0 成功，负值错误码 |
| `xa_load` | 存储的指针，不存在时返回 NULL |
| `xa_erase` | 被删除的指针，不存在时返回 NULL |

**使用示例：**

```c
struct my_data *data = kmalloc(sizeof(*data), GFP_KERNEL);

/* 存储 */
int err = xa_store(&my_xa, 42, data, GFP_KERNEL);
if (err) {
    kfree(data);
    return err;
}

/* 加载 */
struct my_data *loaded = xa_load(&my_xa, 42);

/* 删除 */
struct my_data *deleted = xa_erase(&my_xa, 42);
kfree(deleted);
```

---

### xa_for_each

遍历 XArray。

```c
#define xa_for_each(xa, index, entry) \
    for (index = 0, entry = xa_find(xa, &index, ULONG_MAX, XA_PRESENT); \
         entry; \
         entry = xa_find_after(xa, &index, ULONG_MAX, XA_PRESENT))
```

| 参数 | 说明 |
|------|------|
| `xa` | XArray 指针 |
| `index` | `unsigned long` 类型，当前索引 |
| `entry` | `void *` 类型，当前元素 |

**使用示例：**

```c
unsigned long index;
void *entry;

xa_for_each(&my_xa, index, entry) {
    struct my_data *data = entry;
    printk("Index: %lu\n", index);
}
```

---

### xa_empty

检查 XArray 是否为空。

```c
bool xa_empty(const struct xarray *xa);
```

| 返回值 | 说明 |
|--------|------|
| `bool` | `true` 表示 XArray 为空 |

**使用示例：**

```c
if (xa_empty(&my_xa)) {
    printk("XArray is empty\n");
}
```

---

## 11. 内核通知链

### 头文件

```c
#include <linux/notifier.h>    // 通知链
```

---

### blocking_notifier_call_chain / atomic_notifier_call_chain

调用通知链。

```c
int blocking_notifier_call_chain(struct blocking_notifier_head *nh,
                                 unsigned long val, void *v);
int atomic_notifier_call_chain(struct atomic_notifier_head *nh,
                               unsigned long val, void *v);
```

| 参数 | 说明 |
|------|------|
| `nh` | 通知链头 |
| `val` | 传递给回调的值 |
| `v` | 传递给回调的指针 |

| 返回值 | 说明 |
|--------|------|
| `int` | `NOTIFY_OK` 表示成功，其他值表示阻止后续调用 |

**使用示例：**

```c
/* 定义通知链 */
BLOCKING_NOTIFIER_HEAD(my_notifier);

/* 注册回调 */
static int my_callback(struct notifier_block *nb, unsigned long action,
                       void *data)
{
    printk("Notification: %lu\n", action);
    return NOTIFY_OK;
}

static struct notifier_block my_nb = {
    .notifier_call = my_callback,
};

/* 注册 */
blocking_notifier_chain_register(&my_notifier, &my_nb);

/* 触发通知 */
blocking_notifier_call_chain(&my_notifier, 0x01, NULL);
```

---

### register_blocking_notifier / register_atomic_notifier

注册/注销通知链。

```c
int blocking_notifier_chain_register(struct blocking_notifier_head *nh,
                                     struct notifier_block *nb);
int blocking_notifier_chain_unregister(struct blocking_notifier_head *nh,
                                       struct notifier_block *nb);
int atomic_notifier_chain_register(struct atomic_notifier_head *nh,
                                   struct notifier_block *nb);
int atomic_notifier_chain_unregister(struct atomic_notifier_head *nh,
                                     struct notifier_block *nb);
```

| 参数 | 说明 |
|------|------|
| `nh` | 通知链头 |
| `nb` | 通知块 |

**使用示例：**

```c
/* 注册 */
blocking_notifier_chain_register(&my_notifier, &my_nb);

/* 注销 */
blocking_notifier_chain_unregister(&my_notifier, &my_nb);
```

---

## 12. 内核日志/着色输出

### 头文件

```c
#include <linux/printk.h>     // printk 及 pr_xxx 宏
```

---

### pr_xxx 着色输出

内核日志宏，自动添加模块名前缀，支持 ANSI 颜色代码。

```c
#define pr_emerg(fmt, ...)   printk(KERN_EMERG pr_fmt(fmt), ##__VA_ARGS__)
#define pr_alert(fmt, ...)   printk(KERN_ALERT pr_fmt(fmt), ##__VA_ARGS__)
#define pr_crit(fmt, ...)    printk(KERN_CRIT pr_fmt(fmt), ##__VA_ARGS__)
#define pr_err(fmt, ...)     printk(KERN_ERR pr_fmt(fmt), ##__VA_ARGS__)
#define pr_warn(fmt, ...)    printk(KERN_WARNING pr_fmt(fmt), ##__VA_ARGS__)
#define pr_notice(fmt, ...)  printk(KERN_NOTICE pr_fmt(fmt), ##__VA_ARGS__)
#define pr_info(fmt, ...)    printk(KERN_INFO pr_fmt(fmt), ##__VA_ARGS__)
#define pr_debug(fmt, ...)   printk(KERN_DEBUG pr_fmt(fmt), ##__VA_ARGS__)
```

| 宏 | 级别 | 说明 |
|-----|------|------|
| `pr_emerg` | 0 | 系统崩溃 |
| `pr_alert` | 1 | 必须立即采取措施 |
| `pr_crit` | 2 | 严重条件 |
| `pr_err` | 3 | 错误条件 |
| `pr_warn` | 4 | 警告条件 |
| `pr_notice` | 5 | 正常但重要 |
| `pr_info` | 6 | 信息性 |
| `pr_debug` | 7 | 调试级 |

**使用示例：**

```c
#include <linux/printk.h>

static int __init my_init(void)
{
    pr_info("Module loaded\n");
    pr_warn("Warning: something unusual\n");
    pr_err("Error: something failed\n");
    pr_debug("Debug: value = %d\n", 42);
    return 0;
}

static void __exit my_exit(void)
{
    pr_info("Module unloaded\n");
}

module_init(my_init);
module_exit(my_exit);
MODULE_LICENSE("GPL");
```

---

### 着色输出（通过 dmesg -c 或 echo 等）

内核日志颜色由 `CONFIG_CONSOLE_LOGCOLOR_DEFAULT` 等配置控制。用户空间可通过以下方式查看：

```bash
# 查看内核日志
dmesg

# 启用彩色输出（需要 CONFIG_PRINTK_COLOR）
dmesg -c

# 或使用工具如 multitail
multitail /var/log/kern.log
```

---

## 参考资料

- [内核文档 - 时间](https://www.kernel.org/doc/Documentation/timers/)
- [内核文档 - 链表](https://www.kernel.org/doc/Documentation/lists/)
- [内核文档 - 红黑树](https://www.kernel.org/doc/Documentation/rbtree.txt)
- [内核文档 - XArray](https://www.kernel.org/doc/Documentation/core-api/xarray.rst)
- [内核文档 - 通知链](https://www.kernel.org/doc/Documentation/notifications/)
