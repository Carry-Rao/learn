# 内核调试 API

## printk 日志

### print

```c
int printk(const char *fmt, ...);
```

**参数说明：**
- `fmt`: 格式化字符串，可包含格式说明符和日志级别前缀
- `...`: 可变参数列表，与格式字符串中的说明符匹配

**返回值：**
- 成功时返回输出的字符数
- 失败时返回负值（如缓冲区满）

**使用示例：**
```c
// 基本用法
printk(KERN_INFO "Module loaded successfully\n");
printk(KERN_WARNING "Insufficient memory\n");
printk(KERN_ERR "Device not found: %d\n", err);

// 带日志级别
printk(KERN_DEBUG "Debug info: %s, %d\n", name, value);
```

### pr_info / pr_debug / pr_err / pr_warn / pr_notice / pr_crit

```c
pr_info(fmt, ...);
pr_debug(fmt, ...);
pr_err(fmt, ...);
pr_warn(fmt, ...);
pr_notice(fmt, ...);
pr_crit(fmt, ...);
```

**参数说明：**
- `fmt`: 格式化字符串
- `...`: 可变参数列表

**返回值：**
- 同 `printk`

**使用示例：**
```c
pr_info("Module initialized\n");
pr_debug("Variable value: %d\n", var);
pr_err("Failed to allocate memory\n");
pr_warn("Deprecated function called\n");
pr_notice("System starting up\n");
pr_crit("Critical error occurred\n");
```

### KERN_* 日志级别

```c
#define KERN_EMERG    "0"    // 系统崩溃
#define KERN_ALERT    "1"    // 必须立即处理
#define KERN_CRIT     "2"    // 严重条件
#define KERN_ERR      "3"    // 错误条件
#define KERN_WARNING  "4"    // 警告条件
#define KERN_NOTICE   "5"    // 正常但重要
#define KERN_INFO     "6"    // 信息性
#define KERN_DEBUG    "7"    // 调试级别
```

**使用示例：**
```c
printk(KERN_EMERG "System panic!\n");
printk(KERN_ALERT "Hardware failure\n");
printk(KERN_CRIT "Resource exhaustion\n");
printk(KERN_ERR "Operation failed\n");
printk(KERN_WARNING "Potential issue\n");
printk(KERN_NOTICE "Important event\n");
printk(KERN_INFO "System info\n");
printk(KERN_DEBUG "Debug info\n");
```

### dynamic debugging (dynamic_debug.md 相关)

```c
#define dynamic_pr_debug(fmt, ...) \
    do { \
        if (static_branch_unlikely(&dynamic_debug_enabled)) \
            pr_debug(fmt, ##__VA_ARGS__); \
    } while (0)

#define dynamic_dev_dbg(dev, fmt, ...) \
    do { \
        if (static_branch_unlikely(&dynamic_debug_enabled)) \
            dev_dbg(dev, fmt, ##__VA_ARGS__); \
    } while (0)
```

**参数说明：**
- `fmt`: 格式化字符串
- `...`: 可变参数列表

**使用示例：**
```c
// 启用动态调试
// echo module <module_name> +p > /sys/kernel/debug/dynamic_debug/control
// 或
// echo file <file_name> +p > /sys/kernel/debug/dynamic_debug/control

dynamic_pr_debug("Dynamic debug message: %s\n", str);
dynamic_dev_dbg(dev, "Device debug: %d\n", val);
```

## 调试输出

### dump_stack

```c
void dump_stack(void);
```

**参数说明：**
- 无

**返回值：**
- 无

**使用示例：**
```c
void my_function(void)
{
    // 检测到异常条件
    if (error_condition) {
        pr_err("Error detected, dumping stack:\n");
        dump_stack();
        return;
    }
    // 正常处理...
}
```

### WARN / WARN_ON / WARN_ONCE / WARN_ON_ONCE

```c
#define WARN(condition, format, ...) \
    ({ \
        int __ret_warned = !!(condition); \
        if (__ret_warned) \
            __WARN_PRINTK(format, ##__VA_ARGS__); \
        __ret_warned; \
    })

#define WARN_ON(condition) \
    ({ \
        int __ret_warned = !!(condition); \
        if (__ret_warned) \
            __WARN_PRINTK(""); \
        __ret_warned; \
    })

#define WARN_ONCE(condition, format, ...) \
    ({ \
        static int __warned; \
        int __ret_warned = !!(condition); \
        if (__ret_warned && !__warned) { \
            __warned = 1; \
            __WARN_PRINTK(format, ##__VA_ARGS__); \
        } \
        __ret_warned; \
    })

#define WARN_ON_ONCE(condition) \
    ({ \
        static int __warned; \
        int __ret_warned = !!(condition); \
        if (__ret_warned && !__warned) { \
            __warned = 1; \
            __WARN_PRINTK(""); \
        } \
        __ret_warned; \
    })
```

**参数说明：**
- `condition`: 条件表达式，为真时触发警告
- `format`: 格式化字符串
- `...`: 可变参数列表

**返回值：**
- 条件表达式的值

**使用示例：**
```c
if (WARN_ON(ptr == NULL)) {
    // 处理空指针情况
    return -EINVAL;
}

WARN_ONCE(test_count > 100, "High test count: %d\n", test_count);

if (WARN(!list_empty(&my_list), "List not empty: %p\n", &my_list)) {
    // 清理列表
    cleanup_list(&my_list);
}
```

### BUG / BUG_ON

```c
#define BUG() \
    do { \
        panic("BUG: %s:%d %s\n", __FILE__, __LINE__, __func__); \
    } while (0)

#define BUG_ON(condition) \
    do { \
        if (unlikely(condition)) { \
            panic("BUG: %s:%d %s\n", __FILE__, __LINE__, #condition); \
        } \
    } while (0)
```

**参数说明：**
- `condition`: 条件表达式，为真时触发 BUG

**返回值：**
- 无（触发后系统崩溃）

**使用示例：**
```c
if (ptr == NULL) {
    BUG_ON(!ptr);
    // 或者
    if (!ptr) {
        pr_err("Null pointer detected\n");
        BUG();
    }
}
```

### panic

```c
void panic(const char *fmt, ...);
```

**参数说明：**
- `fmt`: 格式化字符串
- `...`: 可变参数列表

**返回值：**
- 无（系统崩溃）

**使用示例：**
```c
void critical_error_handler(void)
{
    pr_emerg("Critical system failure!\n");
    panic("System halted due to unrecoverable error");
}

void memory_error(void)
{
    panic("Out of memory: %lu bytes requested\n", size);
}
```

## 动态调试

### dynamic_pr_debug

```c
#define dynamic_pr_debug(fmt, ...) \
    do { \
        if (static_branch_unlikely(&dynamic_debug_enabled)) \
            pr_debug(fmt, ##__VA_ARGS__); \
    } while (0)
```

**参数说明：**
- `fmt`: 格式化字符串
- `...`: 可变参数列表

**使用示例：**
```c
// 动态启用调试
// echo module my_module +p > /sys/kernel/debug/dynamic_debug/control
// 或针对特定文件
// echo file drivers/mydriver.c +p > /sys/kernel/debug/dynamic_debug/control

void my_driver_function(int value)
{
    dynamic_pr_debug("Processing value: %d\n", value);
    // 仅在动态调试启用时输出
}
```

### dynamic_dev_dbg

```c
#define dynamic_dev_dbg(dev, fmt, ...) \
    do { \
        if (static_branch_unlikely(&dynamic_debug_enabled)) \
            dev_dbg(dev, fmt, ##__VA_ARGS__); \
    } while (0)
```

**参数说明：**
- `dev`: 设备结构体指针
- `fmt`: 格式化字符串
- `...`: 可变参数列表

**使用示例：**
```c
void my_device_init(struct device *dev)
{
    dynamic_dev_dbg(dev, "Initializing device\n");
    // 仅在动态调试启用时输出
}
```

### dyndbg

```c
// 动态调试控制接口
// 读取当前设置：
// cat /sys/kernel/debug/dynamic_debug/control

// 启用模块的所有调试消息：
// echo module <module_name> +p > /sys/kernel/debug/dynamic_debug/control

// 禁用模块的所有调试消息：
// echo module <module_name> -p > /sys/kernel/debug/dynamic_debug/control

// 启用特定文件的调试：
// echo file <file_name> +p > /sys/kernel/debug/dynamic_debug/control

// 启用特定函数的调试：
// echo function <function_name> +p > /sys/kernel/debug/dynamic_debug/control

// 使用查询格式：
// echo "file drivers/mydriver.c func my_function line 100 +p" > /sys/kernel/debug/dynamic_debug/control
```

## KASAN (Kernel Address Sanitizer)

### kasan_report

```c
void kasan_report(unsigned long addr, size_t size,
                  bool is_write, unsigned long ip);
```

**参数说明：**
- `addr`: 检测到错误的内存地址
- `size`: 访问的内存大小
- `is_write`: 是否为写操作（true 为写，false 为读）
- `ip`: 触发错误的指令指针

**返回值：**
- 无

**使用示例：**
```c
// 通常由 KASAN 自动调用，用户代码很少直接调用
// 当检测到越界访问或 use-after-free 时自动报告

// KASAN 自动报告示例输出：
// BUG: KASAN: slab-out-of-bounds in my_function+0x123/0x456
// Read of size 4 at addr ffff888012345678 by task my_task/1234
// 
// CPU: 0 PID: 1234 Comm: my_task Not tainted 5.10.0
// ...
```

### __asan_load* / __asan_store*

```c
void __asan_load1(unsigned long addr);
void __asan_load2(unsigned long addr);
void __asan_load4(unsigned long addr);
void __asan_load8(unsigned long addr);
void __asan_load16(unsigned long addr);

void __asan_store1(unsigned long addr);
void __asan_store2(unsigned long addr);
void __asan_store4(unsigned long addr);
void __asan_store8(unsigned long addr);
void __asan_store16(unsigned long addr);
```

**参数说明：**
- `addr`: 要访问的内存地址

**返回值：**
- 无

**使用示例：**
```c
// 这些函数通常由编译器自动插入，用户代码很少直接调用
// 编译器在访问内存时自动添加这些检查

// 编译器生成的代码示例（伪代码）：
// void my_function(int *ptr)
// {
//     __asan_load4((unsigned long)ptr);  // 检查读取
//     int value = *ptr;
//     __asan_store4((unsigned long)ptr); // 检查写入
//     *ptr = value + 1;
// }
```

## Kmemleak

### kmemleak_alloc

```c
void kmemleak_alloc(const void *ptr, size_t size, int min_count,
                    gfp_t gfp);
```

**参数说明：**
- `ptr`: 分配的内存指针
- `size`: 分配的内存大小
- `min_count`: 最小引用计数（通常为 1）
- `gfp`: GFP 标志

**返回值：**
- 无

**使用示例：**
```c
// 通常在内存分配器中自动调用
// kmalloc 分配时会自动调用

void *my_alloc(size_t size)
{
    void *ptr = kmalloc(size, GFP_KERNEL);
    if (ptr) {
        kmemleak_alloc(ptr, size, 1, GFP_KERNEL);
    }
    return ptr;
}
```

### kmemleak_free

```c
void kmemleak_free(const void *ptr);
```

**参数说明：**
- `ptr`: 要释放的内存指针

**返回值：**
- 无

**使用示例：**
```c
// 通常在内存释放器中自动调用
// kfree 释放时会自动调用

void my_free(void *ptr)
{
    if (ptr) {
        kmemleak_free(ptr);
        kfree(ptr);
    }
}
```

### kmemleak_scan

```c
void kmemleak_scan(void);
```

**参数说明：**
- 无

**返回值：**
- 无

**使用示例：**
```c
// 通过 /proc 接口触发扫描
// echo scan > /sys/kernel/debug/kmemleak
// 或通过代码触发

void trigger_memory_leak_detection(void)
{
    kmemleak_scan();
    pr_info("Memory leak scan completed\n");
    // 查看结果
    // cat /sys/kernel/debug/kmemleak
}
```

## Kprobes

### register_kprobe / unregister_kprobe

```c
int register_kprobe(struct kprobe *p);
void unregister_kprobe(struct kprobe *p);
```

**参数说明：**
- `p`: kprobe 结构体指针

**返回值：**
- `register_kprobe`: 成功返回 0，失败返回负错误码
- `unregister_kprobe`: 无

**使用示例：**
```c
static int handler_pre(struct kprobe *p, struct pt_regs *regs)
{
    pr_info("Pre-handler: ip=%lx, ax=%lx\n",
            instruction_pointer(regs), regs->ax);
    return 0;
}

static void handler_post(struct kprobe *p, struct pt_regs *regs,
                         unsigned long flags)
{
    pr_info("Post-handler: ip=%lx\n", instruction_pointer(regs));
}

static int handler_fault(struct kprobe *p, struct pt_regs *regs, int trapnr)
{
    pr_info("Fault handler: trapnr=%d\n", trapnr);
    return 0;
}

static struct kprobe my_kprobe = {
    .symbol_name = "my_function",
    .pre_handler = handler_pre,
    .post_handler = handler_post,
    .fault_handler = handler_fault,
};

static int __init my_init(void)
{
    int ret;
    
    ret = register_kprobe(&my_kprobe);
    if (ret < 0) {
        pr_err("register_kprobe failed, returned %d\n", ret);
        return ret;
    }
    pr_info("kprobe registered\n");
    return 0;
}

static void __exit my_exit(void)
{
    unregister_kprobe(&my_kprobe);
    pr_info("kprobe unregistered\n");
}

module_init(my_init);
module_exit(my_exit);
```

### kretprobe_register / kretprobe_unregister

```c
int kretprobe_register(struct kretprobe *rp);
void kretprobe_unregister(struct kretprobe *rp);
```

**参数说明：**
- `rp`: kretprobe 结构体指针

**返回值：**
- `kretprobe_register`: 成功返回 0，失败返回负错误码
- `kretprobe_unregister`: 无

**使用示例：**
```c
static int entry_handler(struct kretprobe_instance *ri,
                         struct pt_regs *regs)
{
    // 可以存储返回地址或其他信息
    return 0;
}

static int ret_handler(struct kretprobe_instance *ri,
                       struct pt_regs *regs)
{
    unsigned long retval = regs_return_value(regs);
    pr_info("Function returned: %lx\n", retval);
    return 0;
}

static struct kretprobe my_kretprobe = {
    .kp.symbol_name = "my_function",
    .entry_handler = entry_handler,
    .handler = ret_handler,
    .maxactive = 20,
};

static int __init my_init(void)
{
    int ret;
    
    ret = kretprobe_register(&my_kretprobe);
    if (ret < 0) {
        pr_err("kretprobe_register failed, returned %d\n", ret);
        return ret;
    }
    pr_info("kretprobe registered\n");
    return 0;
}

static void __exit my_exit(void)
{
    kretprobe_unregister(&my_kretprobe);
    pr_info("kretprobe unregistered\n");
}

module_init(my_init);
module_exit(my_exit);
```

### kprobe_register / kprobe_enable / kprobe_disable

```c
int kprobe_register(struct kprobe *kp);
int kprobe_enable(struct kprobe *kp);
int kprobe_disable(struct kprobe *kp);
```

**参数说明：**
- `kp`: kprobe 结构体指针

**返回值：**
- 成功返回 0，失败返回负错误码

**使用示例：**
```c
static struct kprobe my_kprobe = {
    .symbol_name = "my_function",
    .pre_handler = handler_pre,
};

static int __init my_init(void)
{
    int ret;
    
    ret = kprobe_register(&my_kprobe);
    if (ret < 0) {
        pr_err("kprobe_register failed\n");
        return ret;
    }
    
    // 禁用 kprobe
    kprobe_disable(&my_kprobe);
    
    // 重新启用
    kprobe_enable(&my_kprobe);
    
    return 0;
}

static void __exit my_exit(void)
{
    kprobe_disable(&my_kprobe);
    kprobe_unregister(&my_kprobe);
}
```

## ftrace 接口

### trace_printk

```c
#define trace_printk(fmt, ...) \
    do { \
        static __printf_format_string(2, 0) \
        char __trace_printk_fmt[] = fmt; \
        __trace_printk(__builtin_return_address(0), \
                       __trace_printk_fmt, ##__VA_ARGS__); \
    } while (0)

int __trace_printk(unsigned long ip, const char *fmt, ...);
```

**参数说明：**
- `fmt`: 格式化字符串
- `...`: 可变参数列表

**返回值：**
- 输出的字符数

**使用示例：**
```c
void my_function(void)
{
    trace_printk("Entering my_function\n");
    
    // 带参数的 trace_printk
    trace_printk("Processing data: %d, %s\n", value, str);
    
    // 在函数退出前
    trace_printk("Exiting my_function\n");
}

// 使用方法：
// echo 1 > /sys/kernel/debug/tracing/tracing_on
// cat /sys/kernel/debug/tracing/trace
```

### trace_mark

```c
void trace_mark(const char *fmt, ...);
```

**参数说明：**
- `fmt`: 格式化字符串
- `...`: 可变参数列表

**返回值：**
- 无

**使用示例：**
```c
void my_function(void)
{
    trace_mark("my_function: start\n");
    
    // 执行一些操作
    do_work();
    
    trace_mark("my_function: end\n");
}
```

### tracing_mark_write

```c
void tracing_mark_write(const char *buf);
```

**参数说明：**
- `buf`: 要写入的字符串

**返回值：**
- 无

**使用示例：**
```c
void my_function(void)
{
    char buf[64];
    
    snprintf(buf, sizeof(buf), "my_function: start\n");
    tracing_mark_write(buf);
    
    do_work();
    
    snprintf(buf, sizeof(buf), "my_function: end\n");
    tracing_mark_write(buf);
}

// 使用方法：
// cat /sys/kernel/debug/tracing/trace_pipe
```

## Tracepoints

### tracepoint / DEFINE_EVENT / TRACE_EVENT

```c
// 定义 tracepoint
TRACE_EVENT(name, TP_PROTO(args), TP_STRUCT__entry(...), 
            TP_fast_assign(...), TP_printk(fmt, ...))

// 定义事件
DEFINE_EVENT(class, name, TP_PROTO(args), TP_STRUCT__entry(...), 
             TP_fast_assign(...), TP_printk(fmt, ...))
```

**参数说明：**
- `name`: tracepoint 名称
- `args`: 函数参数
- `entry`: 事件结构体字段
- `fmt`: 格式化字符串

**使用示例：**
```c
// 定义 tracepoint
DECLARE_TRACE(my_tracepoint, TP_PROTO(int data), TP_ARGS(data));

// 定义事件
TRACE_EVENT(my_event,
    TP_PROTO(int id, const char *name),
    TP_STRUCT__entry(
        __field(int, id)
        __string(name, name)
    ),
    TP_fast_assign(
        __entry->id = id;
        __assign_str(name, name);
    ),
    TP_printk("id=%d name=%s", __entry->id, __get_str(name))
);

// 使用 tracepoint
void my_function(void)
{
    trace_my_tracepoint(42);
    trace_my_event(1, "test");
}
```

### register_trace_* / unregister_trace_*

```c
// 注册 tracepoint 回调
int register_trace_##name(void (*probe)(void *data, proto), void *data);

// 注销 tracepoint 回调
void unregister_trace_##name(void (*probe)(void *data, proto), void *data);
```

**参数说明：**
- `probe`: 回调函数
- `data`: 传递给回调的数据

**返回值：**
- `register_trace_*`: 成功返回 0，失败返回负错误码
- `unregister_trace_*`: 无

**使用示例：**
```c
static void my_probe(void *data, int value)
{
    pr_info("Tracepoint triggered: value=%d\n", value);
}

static int __init my_init(void)
{
    int ret;
    
    ret = register_trace_my_tracepoint(my_probe, NULL);
    if (ret < 0) {
        pr_err("register_trace failed\n");
        return ret;
    }
    
    pr_info("Tracepoint registered\n");
    return 0;
}

static void __exit my_exit(void)
{
    unregister_trace_my_tracepoint(my_probe, NULL);
    pr_info("Tracepoint unregistered\n");
}

module_init(my_init);
module_exit(my_exit);
```

## 调试文件系统

### debugfs_create_file

```c
struct dentry *debugfs_create_file(const char *name, umode_t mode,
                                   struct dentry *parent, void *data,
                                   const struct file_operations *fops);
```

**参数说明：**
- `name`: 文件名
- `mode`: 文件权限
- `parent`: 父目录
- `data`: 私有数据
- `fops`: 文件操作结构体

**返回值：**
- 成功返回 dentry 指针，失败返回 ERR_PTR

**使用示例：**
```c
static ssize_t my_debug_read(struct file *file, char __user *buf,
                             size_t count, loff_t *ppos)
{
    char data[] = "Hello from debugfs\n";
    
    if (*ppos >= sizeof(data))
        return 0;
    
    if (count > sizeof(data) - *ppos)
        count = sizeof(data) - *ppos;
    
    if (copy_to_user(buf, data + *ppos, count))
        return -EFAULT;
    
    *ppos += count;
    return count;
}

static const struct file_operations my_debug_fops = {
    .owner = THIS_MODULE,
    .read = my_debug_read,
};

static int __init my_init(void)
{
    struct dentry *debugfs_dir;
    
    debugfs_dir = debugfs_create_dir("my_debug", NULL);
    if (IS_ERR(debugfs_dir)) {
        pr_err("Failed to create debugfs directory\n");
        return PTR_ERR(debugfs_dir);
    }
    
    debugfs_create_file("my_file", 0644, debugfs_dir, NULL, &my_debug_fops);
    
    return 0;
}

static void __exit my_exit(void)
{
    debugfs_remove_recursive(debugfs_dir);
}

module_init(my_init);
module_exit(my_exit);
```

### debugfs_create_dir

```c
struct dentry *debugfs_create_dir(const char *name, struct dentry *parent);
```

**参数说明：**
- `name`: 目录名
- `parent`: 父目录

**返回值：**
- 成功返回 dentry 指针，失败返回 ERR_PTR

**使用示例：**
```c
static int __init my_init(void)
{
    struct dentry *debugfs_dir;
    
    debugfs_dir = debugfs_create_dir("my_module", NULL);
    if (IS_ERR(debugfs_dir)) {
        pr_err("Failed to create debugfs directory\n");
        return PTR_ERR(debugfs_dir);
    }
    
    pr_info("Debugfs directory created\n");
    return 0;
}

static void __exit my_exit(void)
{
    debugfs_remove_recursive(debugfs_dir);
}

module_init(my_init);
module_exit(my_exit);
```

### debugfs_create_u32 / debugfs_create_u64 / debugfs_create_bool / debugfs_create_blob

```c
struct dentry *debugfs_create_u32(const char *name, umode_t mode,
                                  struct dentry *parent, u32 *value);
struct dentry *debugfs_create_u64(const char *name, umode_t mode,
                                  struct dentry *parent, u64 *value);
struct dentry *debugfs_create_bool(const char *name, umode_t mode,
                                   struct dentry *parent, bool *value);
struct dentry *debugfs_create_blob(const char *name, umode_t mode,
                                   struct dentry *parent,
                                   struct debugfs_blob_wrapper *blob);
```

**参数说明：**
- `name`: 文件名
- `mode`: 文件权限
- `parent`: 父目录
- `value`: 数据指针
- `blob`: blob 包装器

**返回值：**
- 成功返回 dentry 指针，失败返回 ERR_PTR

**使用示例：**
```c
static u32 my_u32_value = 42;
static u64 my_u64_value = 1234567890ULL;
static bool my_bool_value = true;
static struct debugfs_blob_wrapper my_blob;

static int __init my_init(void)
{
    struct dentry *debugfs_dir;
    char blob_data[] = "Hello Blob!";
    
    debugfs_dir = debugfs_create_dir("my_debug", NULL);
    if (IS_ERR(debugfs_dir)) {
        return PTR_ERR(debugfs_dir);
    }
    
    debugfs_create_u32("my_u32", 0644, debugfs_dir, &my_u32_value);
    debugfs_create_u64("my_u64", 0644, debugfs_dir, &my_u64_value);
    debugfs_create_bool("my_bool", 0644, debugfs_dir, &my_bool_value);
    
    my_blob.data = blob_data;
    my_blob.size = sizeof(blob_data);
    debugfs_create_blob("my_blob", 0644, debugfs_dir, &my_blob);
    
    return 0;
}

static void __exit my_exit(void)
{
    debugfs_remove_recursive(debugfs_dir);
}

module_init(my_init);
module_exit(my_exit);
```

## proc 接口调试

### /proc/sysrq-trigger

```c
// 通过 /proc/sysrq-trigger 触发系统操作
// echo 'h' > /proc/sysrq-trigger  # 显示帮助
// echo 't' > /proc/sysrq-trigger  # 显示所有任务状态
// echo 'm' > /proc/sysrq-trigger  # 显示内存信息
// echo 'c' > /proc/sysrq-trigger  # 触发崩溃
// echo 'b' > /proc/sysrq-trigger  # 重启系统

// 代码中触发
void trigger_sysrq_c(void)
{
    char op = 'c';
    
    // 使用 /proc/sysrq-trigger 接口
    // 实际实现通过 proc 文件系统
}
```

### /proc/meminfo

```c
// 读取 /proc/meminfo 获取内存信息
// cat /proc/meminfo

// 代码中获取内存信息
#include <linux/proc_fs.h>
#include <linux/seq_file.h>

static int meminfo_show(struct seq_file *m, void *v)
{
    struct sysinfo i;
    
    si_meminfo(&i);
    
    seq_printf(m, "MemTotal: %lu kB\n", si_meminfo_unit(&i) * i.totalram);
    seq_printf(m, "MemFree: %lu kB\n", si_meminfo_unit(&i) * i.freeram);
    seq_printf(m, "MemAvailable: %lu kB\n", si_meminfo_unit(&i) * i.totalram - 
               si_meminfo_unit(&i) * (i.totalram - i.freeram));
    
    return 0;
}

static int meminfo_open(struct inode *inode, struct file *file)
{
    return single_open(file, meminfo_show, NULL);
}

static const struct proc_ops meminfo_pops = {
    .proc_open = meminfo_open,
    .proc_read = seq_read,
    .proc_lseek = seq_lseek,
    .proc_release = single_release,
};
```

### /proc/vmstat

```c
// 读取 /proc/vmstat 获取虚拟内存统计信息
// cat /proc/vmstat

// 代码中获取 vmstat 信息
#include <linux/proc_fs.h>
#include <linux/seq_file.h>

static int vmstat_show(struct seq_file *m, void *v)
{
    unsigned long *vmstat = NULL;
    int i;
    
    // 获取 vmstat 数据
    // 实际实现需要访问内核全局变量
    
    return 0;
}

static int vmstat_open(struct inode *inode, struct file *file)
{
    return single_open(file, vmstat_show, NULL);
}

static const struct proc_ops vmstat_pops = {
    .proc_open = vmstat_open,
    .proc_read = seq_read,
    .proc_lseek = seq_lseek,
    .proc_release = single_release,
};
```

## KGDB/KDB

### kgdb

```c
// KGDB 调试器接口
// 启用 KGDB 内核配置：
// CONFIG_KGDB=y
// CONFIG_KGDB_SERIAL_CONSOLE=y
// CONFIG_FRAME_POINTER=y

// 使用 KGDB 连接：
// echo g > /proc/sysrq-trigger  # 进入 KGDB
// 或
// 在 GDB 中：target remote /dev/ttyS0

// 代码中触发 KGDB 断点
#include <linux/kgdb.h>

void trigger_kgdb_breakpoint(void)
{
    kgdb_breakpoint();
}

// 条件断点
void trigger_kgdb_conditional(int condition)
{
    if (condition) {
        kgdb_breakpoint();
    }
}
```

## KUnit 测试

### kunit / kunit_test_suite / kunit_case

```c
// KUnit 测试框架
// 启用 KUnit 内核配置：
// CONFIG_KUNIT=y

// 定义测试用例
static void test_example(struct kunit *test)
{
    int result;
    
    result = 2 + 2;
    
    // 断言
    KUNIT_ASSERT_EQ(test, result, 4);
}

static void test_example2(struct kunit *test)
{
    char *str = "hello";
    
    KUNIT_ASSERT_NOT_NULL(test, str);
    KUNIT_ASSERT_STREQ(test, str, "hello");
}

// 定义测试套件
static struct kunit_case example_test_cases[] = {
    KUNIT_CASE(test_example),
    KUNIT_CASE(test_example2),
    {}
};

static struct kunit_suite example_test_suite = {
    .name = "example",
    .test_cases = example_test_cases,
};
kunit_test_suite(example_test_suite);
```

### kunit_expect_* / ASSERT_*

```c
// 期望断言（继续执行）
KUNIT_EXPECT_EQ(test, actual, expected);
KUNIT_EXPECT_NE(test, actual, not_expected);
KUNIT_EXPECT_LT(test, actual, less_than);
KUNIT_EXPECT_LE(test, actual, less_than_or_equal);
KUNIT_EXPECT_GT(test, actual, greater_than);
KUNIT_EXPECT_GE(test, actual, greater_than_or_equal);
KUNIT_EXPECT_TRUE(test, condition);
KUNIT_EXPECT_FALSE(test, condition);
KUNIT_EXPECT_NULL(test, ptr);
KUNIT_EXPECT_NOT_NULL(test, ptr);
KUNIT_EXPECT_STREQ(test, str1, str2);
KUNIT_EXPECT_STRNEQ(test, str1, str2);
KUNIT_EXPECT_MEM_EQ(test, buf1, buf2, len);
KUNIT_EXPECT_MEM_NE(test, buf1, buf2, len);

// 严格断言（失败时停止测试）
KUNIT_ASSERT_EQ(test, actual, expected);
KUNIT_ASSERT_NE(test, actual, not_expected);
KUNIT_ASSERT_LT(test, actual, less_than);
KUNIT_ASSERT_LE(test, actual, less_than_or_equal);
KUNIT_ASSERT_GT(test, actual, greater_than);
KUNIT_ASSERT_GE(test, actual, greater_than_or_equal);
KUNIT_ASSERT_TRUE(test, condition);
KUNIT_ASSERT_FALSE(test, condition);
KUNIT_ASSERT_NULL(test, ptr);
KUNIT_ASSERT_NOT_NULL(test, ptr);
KUNIT_ASSERT_STREQ(test, str1, str2);
KUNIT_ASSERT_STRNEQ(test, str1, str2);
KUNIT_ASSERT_MEM_EQ(test, buf1, buf2, len);
KUNIT_ASSERT_MEM_NE(test, buf1, buf2, len);
```

**参数说明：**
- `test`: 测试上下文
- `actual`: 实际值
- `expected`: 期望值
- `condition`: 条件表达式
- `ptr`: 指针
- `str1`, `str2`: 字符串
- `buf1`, `buf2`: 缓冲区
- `len`: 比较长度

**使用示例：**
```c
static void test_assertions(struct kunit *test)
{
    int a = 5, b = 10;
    char *str1 = "hello", *str2 = "world";
    
    // 期望断言（测试继续）
    KUNIT_EXPECT_EQ(test, a + b, 15);
    KUNIT_EXPECT_NE(test, a, b);
    KUNIT_EXPECT_LT(test, a, b);
    KUNIT_EXPECT_GT(test, b, a);
    KUNIT_EXPECT_TRUE(test, a < b);
    KUNIT_EXPECT_FALSE(test, a > b);
    KUNIT_EXPECT_STREQ(test, str1, "hello");
    KUNIT_EXPECT_STRNEQ(test, str1, str2);
    
    // 严格断言（测试停止）
    KUNIT_ASSERT_NOT_NULL(test, str1);
    KUNIT_ASSERT_EQ(test, a * 2, 10);
}
```

## lockdep

### lockdep_assert_held

```c
void lockdep_assert_held(struct lockdep_map *lock);
void lockdep_assert_held_write(struct lockdep_map *lock);
void lockdep_assert_held_read(struct lockdep_map *lock);
```

**参数说明：**
- `lock`: 锁映射

**返回值：**
- 无（断言失败时会 BUG）

**使用示例：**
```c
void my_function(struct my_struct *data)
{
    // 断言锁已持有
    lockdep_assert_held(&data->lock);
    
    // 安全地访问数据
    process_data(data);
}

void my_read_function(struct my_struct *data)
{
    lockdep_assert_held_read(&data->rwlock);
    
    // 只读访问
    read_data(data);
}
```

### lockdep_is_held

```c
bool lockdep_is_held(struct lockdep_map *lock);
```

**参数说明：**
- `lock`: 锁映射

**返回值：**
- 如果锁已持有返回 true，否则返回 false

**使用示例：**
```c
void my_function(struct my_struct *data)
{
    if (!lockdep_is_held(&data->lock)) {
        pr_warn("Lock not held\n");
        return;
    }
    
    // 安全地访问数据
    process_data(data);
}
```

### lockdep_init_map

```c
void lockdep_init_map(struct lockdep_map *lock, const char *name,
                      struct lock_class_key *key, int subclass);
```

**参数说明：**
- `lock`: 锁映射
- `name`: 锁名称
- `key`: 锁类键
- `subclass`: 子类编号

**返回值：**
- 无

**使用示例：**
```c
struct my_struct {
    spinlock_t lock;
    struct lockdep_map dep_map;
    // ...
};

static struct lock_class_key my_lock_key;

void init_my_struct(struct my_struct *data)
{
    spin_lock_init(&data->lock);
    lockdep_init_map(&data->dep_map, "my_struct.lock", &my_lock_key, 0);
}

void my_function(struct my_struct *data)
{
    spin_lock(&data->lock);
    // 访问数据
    spin_unlock(&data->lock);
}
```

## fault injection

### fail_make_request

```c
// 故障注入框架
// 启用故障注入内核配置：
// CONFIG_FAIL_MAKE_REQUEST=y
// CONFIG_FAIL_FUTEX=y
// CONFIG_FAIL_IO_TIMEOUT=y

// 通过 /sys 接口控制故障注入
// echo 1 > /sys/kernel/debug/fail_make_request/probability
// echo 10 > /sys/kernel/debug/fail_make_request/times

// 代码中检查是否应该注入故障
#include <linux/fault-inject.h>

bool should_fail(struct fault_attr *attr, unsigned long size);
```

### should_fail

```c
bool should_fail(struct fault_attr *attr, unsigned long size);
```

**参数说明：**
- `attr`: 故障属性结构体
- `size`: 访问大小

**返回值：**
- 如果应该注入故障返回 true，否则返回 false

**使用示例：**
```c
// 定义故障属性
static DECLARE_FAULT_ATTR(my_fault_attr);

// 初始化故障注入
static int __init my_init(void)
{
    // 配置故障属性
    my_fault_attr.probability = 10;  // 10% 概率
    my_fault_attr.interval = 5;      // 每 5 次触发一次
    my_fault_attr.times = 3;         // 触发 3 次
    
    return 0;
}

// 在代码中使用故障注入
int my_io_operation(struct block_device *bdev, sector_t sector,
                    unsigned int nr_sects)
{
    // 检查是否应该注入故障
    if (should_fail(&my_fault_attr, nr_sects << 9)) {
        pr_warn("Injecting I/O failure\n");
        return -EIO;
    }
    
    // 正常执行 I/O 操作
    return do_real_io(bdev, sector, nr_sects);
}
```

## 总结

本文档涵盖了 Linux 内核调试的主要 API，包括：

1. **printk 日志** - 基本的日志输出机制
2. **调试输出** - 堆栈跟踪、警告和错误处理
3. **动态调试** - 运行时调试控制
4. **KASAN** - 内存访问错误检测
5. **Kmemleak** - 内存泄漏检测
6. **Kprobes** - 动态内核探针
7. **ftrace 接口** - 函数跟踪
8. **Tracepoints** - 静态跟踪点
9. **调试文件系统** - debugfs 接口
10. **proc 接口调试** - proc 文件系统接口
11. **KGDB/KDB** - 内核调试器
12. **KUnit 测试** - 内核单元测试框架
13. **lockdep** - 锁依赖检测
14. **fault injection** - 故障注入框架

这些工具和技术为内核开发者提供了强大的调试和测试能力，帮助发现和修复内核中的各种问题。
