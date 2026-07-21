# 中断与软中断 API

## 目录

1. [硬中断](#硬中断)
2. [中断控制](#中断控制)
3. [软中断](#软中断)
4. [Tasklet](#tasklet)
5. [工作队列](#工作队列)
6. [IRQ 描述符](#irq-描述符)
7. [线程化中断](#线程化中断)
8. [中断域](#中断域)
9. [Bottom Half 选型指南](#bottom-half-选型指南)

---

## 硬中断

### request_irq / free_irq

申请和释放中断处理程序。

**函数签名：**

```c
int request_irq(unsigned int irq, irq_handler_t handler,
                unsigned long flags, const char *name, void *dev);

void free_irq(unsigned int irq, void *dev);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `irq` | 要申请的中断号 |
| `handler` | 中断处理函数指针 |
| `flags` | 中断标志（见下方说明） |
| `name` | 中断名称，显示在 `/proc/interrupts` 中 |
| `dev` | 传递给处理函数的设备指针，共享中断时用于区分设备 |

**flags 标志：**

| 标志 | 说明 |
|------|------|
| `IRQF_SHARED` | 允许多个设备共享同一中断线 |
| `IRQF_NO_SUSPEND` | 系统挂起时不关闭此中断 |
| `IRQF_ONESHOT` | 中断在硬中断处理完成前不会重新使能，配合线程化中断使用 |
| `IRQF_NO_THREAD` | 不将此中断转换为线程化中断 |
| `IRQF_TRIGGER_RISING` | 上升沿触发 |
| `IRQF_TRIGGER_FALLING` | 下降沿触发 |
| `IRQF_TRIGGER_HIGH` | 高电平触发 |
| `IRQF_TRIGGER_LOW` | 低电平触发 |

**返回值：**

- `0`：成功
- `-EINVAL`：参数无效
- `-EBUSY`：中断已被占用（非共享模式）
- `-ENOMEM`：内存不足

**irq_handler_t 类型定义：**

```c
typedef irqreturn_t (*irq_handler_t)(int irq, void *dev_id);
```

返回值类型 `irqreturn_t`：
- `IRQ_HANDLED`：中断已被正确处理
- `IRQ_NONE`：此设备未产生中断（共享中断时使用）

**使用示例：**

```c
#include <linux/interrupt.h>

static irqreturn_t my_irq_handler(int irq, void *dev_id)
{
    struct my_device *dev = (struct my_device *)dev_id;

    /* 读取设备状态寄存器，确认是否为本设备中断 */
    if (!(read_status(dev) & MY_IRQ_PENDING))
        return IRQ_NONE;  /* 非本设备中断，共享中断时返回 */

    /* 处理中断 */
    process_data(dev);

    /* 清除中断标志 */
    clear_irq_pending(dev);

    return IRQ_HANDLED;
}

static int __init my_driver_init(void)
{
    int ret;

    ret = request_irq(MY_IRQ_NUM, my_irq_handler,
                      IRQF_SHARED, "my_driver", &my_dev);
    if (ret) {
        pr_err("Failed to request IRQ %d: %d\n", MY_IRQ_NUM, ret);
        return ret;
    }

    return 0;
}

static void __exit my_driver_exit(void)
{
    free_irq(MY_IRQ_NUM, &my_dev);
}

module_init(my_driver_init);
module_exit(my_driver_exit);
```

### IRQF_SHARED 详解

共享中断要求所有注册同一中断号的处理函数都实现 `IRQ_NONE` 检查。硬件必须能指示中断是否来自该设备。

```c
/* 共享中断示例：多个设备使用同一中断 */
static irqreturn_t shared_handler(int irq, void *dev_id)
{
    struct my_device *dev = dev_id;

    if (!is_my_device_irq(dev))
        return IRQ_NONE;  /* 必须返回，让下一个共享设备处理 */

    handle_irq(dev);
    return IRQ_HANDLED;
}

/* 两个设备共享中断 */
request_irq(irq, shared_handler, IRQF_SHARED, "dev_a", &dev_a);
request_irq(irq, shared_handler, IRQF_SHARED, "dev_b", &dev_b);

/* free_irq 的顺序必须与 request_irq 相反 */
free_irq(irq, &dev_b);  /* 最后注册的最先释放 */
free_irq(irq, &dev_a);
```

### IRQF_NO_SUSPEND

用于不能在系统挂起（如 suspend、hibernate）期间关闭的中断，典型用途是唤醒源中断。

```c
/* 唤醒源设备中断，挂起期间仍需响应 */
ret = request_irq(wakeup_irq, wakeup_handler,
                  IRQF_NO_SUSPEND | IRQF_TRIGGER_FALLING,
                  "wakeup_source", &wdev);
```

### IRQF_ONESHOT

保证硬中断处理函数执行期间，中断线不会被重新使能。这对于需要在硬中断上下文中完成关键操作后才能开放中断的场景很重要。通常与线程化中断配合使用。

```c
/* ONESHOT 模式：硬中断不会被提前重新使能 */
ret = request_threaded_irq(irq, hard_irq_handler,
                           threaded_handler,
                           IRQF_ONESHOT | IRQF_TRIGGER_HIGH,
                           "my_device", &my_dev);
```

### IRQF_NO_THREAD

阻止中断被转换为线程化中断，用于必须在硬中断上下文中执行的处理函数。

```c
ret = request_irq(irq, critical_handler,
                  IRQF_NO_THREAD | IRQF_TRIGGER_RISING,
                  "critical_irq", NULL);
```

---

## 中断控制

### disable_irq / enable_irq

禁用和启用指定中断线。`disable_irq` 会等待当前正在执行的中断处理函数完成。

```c
void disable_irq(unsigned int irq);
void enable_irq(unsigned int irq);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `irq` | 要禁用/启用的中断号 |

**返回值：** 无

**使用示例：**

```c
/* 在设备关闭时禁用中断 */
void my_device_shutdown(struct my_device *dev)
{
    disable_irq(dev->irq);

    /* 确保没有中断处理函数在运行后，安全关闭设备 */
    power_off_device(dev);

    /* 需要时重新启用 */
    enable_irq(dev->irq);
}
```

### disable_irq_nosync

立即禁用中断，不等待正在执行的中断处理函数完成。

```c
void disable_irq_nosync(unsigned int irq);
```

**返回值：** 无

**与 disable_irq 的区别：**

| 函数 | 行为 |
|------|------|
| `disable_irq` | 等待所有执行中的中断处理函数返回后才返回 |
| `disable_irq_nosync` | 立即返回，不等待 |

**使用示例：**

```c
/* 在不能睡眠的上下文中禁用中断 */
static void my_tasklet_handler(unsigned long data)
{
    struct my_device *dev = (struct my_device *)data;

    /* tasklet 上下文不能睡眠，使用 nosync 版本 */
    disable_irq_nosync(dev->irq);
    /* 注意：此后需要在合适时机调用 enable_irq */
}
```

### synchronize_irq

等待指定中断的当前执行实例完成。

```c
void synchronize_irq(unsigned int irq);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `irq` | 要同步的中断号 |

**返回值：** 无

**使用示例：**

```c
/* 确保中断处理函数完成后，再修改共享状态 */
void my_device_remove(struct my_device *dev)
{
    free_irq(dev->irq, dev);

    /* free_irq 后无需 synchronize，但有时在其他场景使用 */
    synchronize_irq(dev->irq);

    /* 现在可以安全释放资源 */
    kfree(dev->buffer);
}
```

### irq_set_affinity

设置中断的 CPU 亲和性。

```c
int irq_set_affinity(unsigned int irq, const struct cpumask *mask);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `irq` | 中断号 |
| `mask` | 目标 CPU 掩码 |

**返回值：**

- `0`：成功
- 负值：失败

**使用示例：**

```c
#include <linux/cpumask.h>

/* 将中断绑定到 CPU 0 */
cpumask_t mask;
cpumask_clear(&mask);
cpumask_set_cpu(0, &mask);
irq_set_affinity(irq, &mask);

/* 将中断绑定到 CPU 1 和 CPU 2 */
cpumask_t mask;
cpumask_clear(&mask);
cpumask_set_cpu(1, &mask);
cpumask_set_cpu(2, &mask);
irq_set_affinity(irq, &mask);
```

### irq_can_set_affinity

检查是否可以设置指定中断的亲和性。

```c
int irq_can_set_affinity(unsigned int irq);
```

**返回值：**

- `1`：可以设置
- `0`：不可以设置

**使用示例：**

```c
if (irq_can_set_affinity(dev->irq)) {
    irq_set_affinity(dev->irq, target_cpus);
    pr_info("IRQ %d affinity set\n", dev->irq);
} else {
    pr_warn("IRQ %d does not support affinity setting\n", dev->irq);
}
```

---

## 软中断

### softirq_action 结构体

软中断处理函数的参数结构。

```c
struct softirq_action {
    void (*action)(struct softirq_action *);
};
```

**说明：** 系统预定义了 10 个软中断向量（HI_SOFTIRQ 到 RCU_SOFTIRQ），每个向量对应一个 `softirq_action` 结构。

### open_softirq / raise_softirq

注册和触发软中断。

```c
void open_softirq(int nr, void (*action)(struct softirq_action *));
void raise_softirq(unsigned int nr);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `nr` | 软中断编号（如 NET_TX_SOFTIRQ、NET_RX_SOFTIRQ） |
| `action` | 软中断处理函数 |

**软中断编号定义（部分）：**

| 编号 | 名称 | 用途 |
|------|------|------|
| 0 | `HI_SOFTIRQ` | 高优先级 tasklet |
| 1 | `TIMER_SOFTIRQ` | 定时器 |
| 2 | `NET_TX_SOFTIRQ` | 网络发送 |
| 3 | `NET_RX_SOFTIRQ` | 网络接收 |
| 4 | `BLOCK_SOFTIRQ` | 块设备 |
| 5 | `IRQ_POLL_SOFTIRQ` | 中断轮询 |
| 6 | `TASKLET_SOFTIRQ` | 普通 tasklet |
| 7 | `SCHED_SOFTIRQ` | 调度器 |
| 8 | `HRTIMER_SOFTIRQ` | 高精度定时器 |
| 9 | `RCU_SOFTIRQ` | RCU |

**使用示例：**

```c
#include <linux/interrupt.h>

static void my_softirq_handler(struct softirq_action *action)
{
    /* 处理软中断任务 */
    process_softirq_data();
}

static int __init my_init(void)
{
    open_softirq(MY_SOFTIRQ, my_softirq_handler);
    return 0;
}

static void trigger_softirq_work(void)
{
    raise_softirq(MY_SOFTIRQ);
}
```

### local_bh_disable / local_bh_enable

禁用和启用软中断（Bottom Half）在当前处理器上的执行。

```c
void local_bh_disable(void);
void local_bh_enable(void);
void local_bh_disable_ip(unsigned long ip);
void local_bh_enable_ip(unsigned long ip);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `ip` | 指令地址（用于调试信息） |

**返回值：** 无

**使用示例：**

```c
void my_protected_section(void)
{
    /* 禁用软中断，防止与软中断处理函数竞争 */
    local_bh_disable();

    /* 执行与软中断共享数据的操作 */
    modify_shared_data();

    /* 启用软中断 */
    local_bh_enable();
}
```

---

## Tasklet

### DECLARE_TASKLET

静态声明一个 tasklet。

```c
DECLARE_TASKLET(name, func, data);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `name` | tasklet 名称 |
| `func` | tasklet 处理函数 |
| `data` | 传递给处理函数的数据 |

**宏展开等价于：**

```c
struct tasklet_struct name = {
    .next = NULL,
    .state = 0,
    .count = ATOMIC_INIT(1),
    .func = func,
    .data = data,
};
```

### tasklet_init

动态初始化一个 tasklet。

```c
void tasklet_init(struct tasklet_struct *t,
                  void (*func)(unsigned long),
                  unsigned long data);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `t` | tasklet 结构体指针 |
| `func` | tasklet 处理函数 |
| `data` | 传递给处理函数的数据 |

**返回值：** 无

### tasklet_func 类型定义

```c
typedef void (*tasklet_callback_t)(unsigned long);
```

### tasklet_schedule / tasklet_hi_schedule

调度 tasklet 执行。

```c
void tasklet_schedule(struct tasklet_struct *t);
void tasklet_hi_schedule(struct tasklet_struct *t);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `t` | tasklet 结构体指针 |

**返回值：** 无

**区别：**

| 函数 | 优先级 |
|------|------|
| `tasklet_schedule` | 普通优先级（TASKLET_SOFTIRQ） |
| `tasklet_hi_schedule` | 高优先级（HI_SOFTIRQ） |

### tasklet_kill

等待 tasklet 完成后销毁。

```c
void tasklet_kill(struct tasklet_struct *t);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `t` | 要销毁的 tasklet 结构体指针 |

**返回值：** 无

**注意：** 调用此函数前必须先调用 `tasklet_disable` 或 `tasklet_disable_nosync`。

### tasklet_enable / tasklet_disable

启用和禁用 tasklet。

```c
void tasklet_enable(struct tasklet_struct *t);
void tasklet_disable(struct tasklet_struct *t);
void tasklet_disable_nosync(struct tasklet_struct *t);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `t` | tasklet 结构体指针 |

**返回值：** 无

**说明：**
- `tasklet_disable` 会等待正在运行的 tasklet 完成
- `tasklet_disable_nosync` 立即返回，不等待

**完整 Tasklet 示例：**

```c
#include <linux/interrupt.h>

struct my_data {
    int value;
    char buffer[256];
};

static struct my_data my_device_data;
static DECLARE_TASKLET(my_tasklet, my_tasklet_handler,
                       (unsigned long)&my_device_data);

static void my_tasklet_handler(unsigned long data)
{
    struct my_data *d = (struct my_data *)data;

    /* 在 tasklet 上下文中处理数据（不可睡眠） */
    pr_info("Processing data: %d\n", d->value);
    process_buffer(d->buffer);
}

static irqreturn_t my_irq_handler(int irq, void *dev_id)
{
    struct my_data *d = &my_device_data;

    /* 收集数据 */
    d->value = read_device_value();

    /* 调度 tasklet 处理 */
    tasklet_schedule(&my_tasklet);

    return IRQ_HANDLED;
}

static int __init my_init(void)
{
    int ret;

    ret = request_irq(IRQ_NUM, my_irq_handler,
                      0, "my_device", NULL);
    if (ret)
        return ret;

    return 0;
}

static void __exit my_exit(void)
{
    free_irq(IRQ_NUM, NULL);

    /* 先禁用再销毁 */
    tasklet_disable(&my_tasklet);
    tasklet_kill(&my_tasklet);
}

module_init(my_init);
module_exit(my_exit);
```

---

## 工作队列

### workqueue_struct

工作队列结构体（内核内部使用，驱动通常通过接口创建）。

```c
struct workqueue_struct {
    /* 内核内部字段 */
    const char *name;
    struct list_head pwqs;
    struct list_head list;
    /* ... */
};
```

### init_workqueue（实际为 alloc_workqueue）

创建和销毁工作队列。

```c
struct workqueue_struct *alloc_workqueue(const char *fmt,
                                         unsigned int flags,
                                         int max_active,
                                         ...);

struct workqueue_struct *alloc_ordered_workqueue(const char *fmt,
                                                 unsigned int flags,
                                                 ...);

void destroy_workqueue(struct workqueue_struct *wq);
```

**flags 标志：**

| 标志 | 说明 |
|------|------|
| `WQ_UNBOUND` | 工作不在绑定的 CPU 上执行 |
| `WQ_HIGHPRI` | 高优先级工作队列 |
| `WQ_CPU_INTENSIVE` | CPU 密集型工作 |
| `WQ_MEM_RECLAIM` | 内存回收工作队列 |
| `WQ_FREEZABLE` | 冻结支持 |

**返回值：**

- 成功：返回 `workqueue_struct` 指针
- 失败：返回 `NULL`

**使用示例：**

```c
static struct workqueue_struct *my_wq;

static int __init my_init(void)
{
    my_wq = alloc_workqueue("my_wq", WQ_UNBOUND, 0);
    if (!my_wq)
        return -ENOMEM;

    return 0;
}

static void __exit my_exit(void)
{
    destroy_workqueue(my_wq);
}
```

### DECLARE_WORK / INIT_WORK

静态和动态声明工作项。

```c
DECLARE_WORK(name, function);
DECLARE_DELAYED_WORK(name, function);

void INIT_WORK(struct work_struct *work, work_func_t func);
void INIT_DELAYED_WORK(struct delayed_work *work, work_func_t func);
```

**work_func_t 类型定义：**

```c
typedef void (*work_func_t)(struct work_struct *work);
```

### queue_work / queue_delayed_work

提交工作到工作队列。

```c
bool queue_work(struct workqueue_struct *wq,
                struct work_struct *work);

bool queue_delayed_work(struct workqueue_struct *wq,
                        struct delayed_work *work,
                        unsigned long delay);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `wq` | 目标工作队列 |
| `work` | 工作项指针 |
| `delay` | 延迟执行的 jiffies 数 |

**返回值：**

- `true`：工作成功排队
- `false`：工作已在队列中（未重复排队）

### cancel_work_sync / cancel_delayed_work_sync

取消挂起的工作项。

```c
bool cancel_work_sync(struct work_struct *work);
bool cancel_delayed_work_sync(struct delayed_work *work);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `work` | 要取消的工作项 |

**返回值：**

- `true`：工作被成功取消
- `false`：工作正在执行中或已完成

### flush_workqueue

等待工作队列中的所有工作完成。

```c
void flush_workqueue(struct workqueue_struct *wq);
void drain_workqueue(struct workqueue_struct *wq);
```

**使用示例：**

```c
struct my_work_data {
    struct work_struct work;
    int status;
    struct completion done;
};

static void my_work_handler(struct work_struct *work)
{
    struct my_work_data *data =
        container_of(work, struct my_work_data, work);

    /* 执行工作（可以睡眠） */
    data->status = do_heavy_work();
    complete(&data->done);
}

/* 使用静态 DECLARE_WORK */
static DECLARE_WORK(my_work, my_work_handler);
static struct my_work_data work_data;

/* 提交工作 */
void submit_work(void)
{
    work_data.status = 0;
    init_completion(&work_data.done);
    queue_work(system_wq, &my_work);
}

/* 等待工作完成 */
void wait_for_work(void)
{
    wait_for_completion(&work_data.done);
    pr_info("Work completed with status: %d\n", work_data.status);
}

/* 取消工作 */
void cancel_work(void)
{
    cancel_work_sync(&my_work);
}

/* 使用延迟工作 */
static DECLARE_DELAYED_WORK(my_delayed_work, my_delayed_handler);

void submit_delayed_work(void)
{
    /* 延迟 100ms 后执行 */
    queue_delayed_work(system_wq, &my_delayed_work, msecs_to_jiffies(100));
}

/* 取消延迟工作 */
void cancel_delayed_work(void)
{
    cancel_delayed_work_sync(&my_delayed_work);
}
```

### flush_work 与 cancel_work 的区别

```c
/* cancel_work_sync: 尝试取消，如果正在执行则等待完成 */
cancel_work_sync(&my_work);

/* flush_work: 等待正在执行的工作完成，不取消挂起的工作 */
flush_work(&my_work);
```

---

## IRQ 描述符

### irq_desc 结构体

中断描述符，内核内部表示一个中断线的核心结构。

```c
struct irq_desc {
    struct irq_common_data  irq_common_data;
    struct irq_data         irq_data;
    unsigned int __percpu   *kstat_irqs;
    irq_flow_handler_t      handle_irq;
    struct irq_chip         *irq_chip;
    struct msi_desc         *msi_desc;
    void                    *handler_data;
    struct radix_tree_root  pending_mask;
    unsigned int            irq;
    unsigned int            node;
    unsigned int            lock_index;
    raw_spinlock_t          lock;
    struct lockdep_map      lockdep_map;
    /* ... */
};
```

### irq_to_desc

通过中断号获取中断描述符。

```c
struct irq_desc *irq_to_desc(unsigned int irq);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `irq` | 中断号 |

**返回值：**

- 成功：返回 `irq_desc` 指针
- 失败：返回 `NULL`

**使用示例：**

```c
struct irq_desc *desc = irq_to_desc(irq);
if (desc) {
    pr_info("IRQ %d: chip=%s, handler=%s\n",
            irq,
            desc->irq_chip->name,
            desc->handle_irq ? "set" : "not set");
}
```

### handle_irq_event

执行中断事件处理。

```c
irqreturn_t handle_irq_event(struct irq_desc *desc);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `desc` | 中断描述符 |

**返回值：** `irqreturn_t` 类型

### irq_chip 结构体

中断控制器的硬件抽象层。

```c
struct irq_chip {
    const char      *name;
    unsigned int    (*irq_startup)(struct irq_data *data);
    void            (*irq_shutdown)(struct irq_data *data);
    void            (*irq_enable)(struct irq_data *data);
    void            (*irq_disable)(struct irq_data *data);
    void            (*irq_ack)(struct irq_data *data);
    void            (*irq_mask)(struct irq_data *data);
    void            (*irq_mask_ack)(struct irq_data *data);
    void            (*irq_unmask)(struct irq_data *data);
    void            (*irq_eoi)(struct irq_data *data);
    int             (*irq_set_affinity)(struct irq_data *data,
                                        const struct cpumask *dest,
                                        bool force);
    int             (*irq_set_type)(struct irq_data *data,
                                    unsigned int flow_type);
    int             (*irq_set_wake)(struct irq_data *data, unsigned int on);
    /* ... */
};
```

**使用示例：**

```c
/* 查看中断控制器信息 */
void show_irq_chip_info(unsigned int irq)
{
    struct irq_desc *desc = irq_to_desc(irq);

    if (!desc || !desc->irq_chip)
        return;

    pr_info("IRQ %d:\n", irq);
    pr_info("  Chip: %s\n", desc->irq_chip->name);
    pr_info("  Name: %s\n", desc->name ?: "unknown");
}
```

---

## 线程化中断

### request_threaded_irq

申请线程化中断处理。

```c
int request_threaded_irq(unsigned int irq,
                         irq_handler_t handler,
                         irq_handler_t thread_fn,
                         unsigned long flags,
                         const char *name,
                         void *dev);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `irq` | 中断号 |
| `handler` | 硬中断处理函数（在中断上下文执行） |
| `thread_fn` | 线程化中断处理函数（在进程上下文执行） |
| `flags` | 中断标志（通常需要 `IRQF_ONESHOT`） |
| `name` | 中断名称 |
| `dev` | 设备指针 |

**返回值：**

- `0`：成功
- 负值：失败

**irq_handler_t 类型定义（硬中断）：**

```c
typedef irqreturn_t (*irq_handler_t)(int irq, void *dev_id);
```

**irq_thread_fn 类型定义（线程化处理）：**

```c
typedef irqreturn_t (*irq_thread_fn)(int irq, void *dev_id);
```

### 线程化中断处理流程

1. 硬件产生中断 → 内核调度硬中断处理函数 `handler`
2. `handler` 通常只做最少的工作（读取中断状态）
3. 返回 `IRQ_WAKE_THREAD` 唤醒内核线程
4. 内核线程调用 `thread_fn`，可在进程上下文执行（可睡眠）

**使用示例：**

```c
#include <linux/interrupt.h>
#include <linux/delay.h>

static irqreturn_t my_hard_irq(int irq, void *dev_id)
{
    struct my_device *dev = dev_id;

    /* 在中断上下文中只做最少的工作 */
    if (!(read_reg(dev) & IRQ_STATUS))
        return IRQ_NONE;

    /* 禁用进一步中断（配合 IRQF_ONESHOT） */
    disable_irq_nosync(irq);

    return IRQ_WAKE_THREAD;  /* 唤醒线程化处理函数 */
}

static irqreturn_t my_thread_irq(int irq, void *dev_id)
{
    struct my_device *dev = dev_id;

    /* 在进程上下文中处理（可以睡眠） */
    process_data(dev);

    /* 复杂操作，如 I2C 通信 */
    i2c_read_data(dev);

    /* 完成后重新启用中断 */
    enable_irq(irq);

    return IRQ_HANDLED;
}

static int __init my_init(void)
{
    int ret;

    ret = request_threaded_irq(IRQ_NUM, my_hard_irq, my_thread_irq,
                               IRQF_ONESHOT | IRQF_TRIGGER_FALLING,
                               "my_threaded_device", &my_dev);
    if (ret)
        return ret;

    return 0;
}

static void __exit my_exit(void)
{
    free_irq(IRQ_NUM, &my_dev);
}
```

### 线程化中断与共享中断

```c
/* 注意：request_threaded_irq 不支持 IRQF_SHARED */
/* 如需共享，应使用 request_irq 并在硬中断中处理 */
```

---

## 中断域

### irq_domain 结构体

中断域用于管理硬件中断号到 Linux 虚拟中断号的映射。

```c
struct irq_domain {
    struct list_head link;
    const char *name;
    const struct irq_domain_ops *ops;
    void *host_data;
    unsigned int flags;
    /* ... */
};
```

### irq_domain_ops

中断域操作函数集。

```c
struct irq_domain_ops {
    int (*match)(struct irq_domain *d, struct device_node *node,
                 enum irq_domain_bus_token bus_token);
    int (*map)(struct irq_domain *d, unsigned int virq,
               irq_hw_number_t hwirq);
    int (*unmap)(struct irq_domain *d, unsigned int virq);
    void (*free)(struct irq_domain *d, unsigned int virq, unsigned int nr_irqs);
    int (*alloc)(struct irq_domain *d, unsigned int virq, unsigned int nr_irqs,
                 void *arg);
    /* ... */
};
```

### irq_domain_add

创建中断域。

```c
struct irq_domain *irq_domain_add_linear(struct device_node *of_node,
                                          unsigned int size,
                                          const struct irq_domain_ops *ops,
                                          void *host_data);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `of_node` | 设备树节点 |
| `size` | 最大中断数 |
| `ops` | 中断域操作函数集 |
| `host_data` | 主机数据 |

**返回值：**

- 成功：返回 `irq_domain` 指针
- 失败：返回 `NULL`

### irq_domain_associate

将硬件中断号映射到虚拟中断号。

```c
int irq_domain_associate(struct irq_domain *domain,
                         unsigned int virq,
                         irq_hw_number_t hwirq);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `domain` | 中断域 |
| `virq` | Linux 虚拟中断号 |
| `hwirq` | 硬件中断号 |

**返回值：**

- `0`：成功
- 负值：失败

### irq_domain_alloc_irqs

从域中分配中断。

```c
int irq_domain_alloc_irqs(struct irq_domain *domain,
                          unsigned int irq_size,
                          int node,
                          void *arg);
```

**参数说明：**

| 参数 | 说明 |
|------|------|
| `domain` | 中断域 |
| `irq_size` | 要分配的中断数 |
| `node` | NUMA 节点 |
| `arg` | 额外参数 |

**返回值：**

- 成功：返回起始虚拟中断号
- 失败：返回负值

**使用示例（设备树中断控制器驱动）：**

```c
#include <linux/irqdomain.h>
#include <linux/of_irq.h>

static int my_domain_map(struct irq_domain *d, unsigned int virq,
                         irq_hw_number_t hwirq)
{
    irq_set_chip_and_handler(virq, &my_irq_chip,
                             handle_edge_irq);
    irq_set_handler_data(virq, d->host_data);
    irq_set_nested_thread(virq, true);
    irq_set_noprobe(virq);

    return 0;
}

static const struct irq_domain_ops my_domain_ops = {
    .map  = my_domain_map,
    .xlate = irq_domain_xlate_twocell,
};

static int __init my_irq_domain_init(void)
{
    struct irq_domain *domain;

    domain = irq_domain_add_linear(
        of_find_compatible_node(NULL, NULL, "my,irq-controller"),
        32, &my_domain_ops, NULL);
    if (!domain)
        return -ENOMEM;

    return 0;
}
```

---

## Bottom Half 选型指南

### 特性对比

| 特性 | softirq | tasklet | workqueue |
|------|---------|---------|-----------|
| **上下文** | 软中断上下文 | 软中断上下文 | 进程上下文 |
| **可睡眠** | 否 | 否 | 是 |
| **并发性** | 同一 softirq 可在多个 CPU 并行 | 同一 tasklet 不可在多个 CPU 并行 | 可并行（取决于 workqueue） |
| **优先级** | 高（早于 tasklet） | 中（使用 HI_SOFTIRQ 时高） | 低 |
| **动态创建** | 否（编译时静态分配） | 是 | 是 |
| **典型延迟** | 微秒级 | 微秒级 | 毫秒级 |
| **性能** | 最高 | 高 | 中等 |

### 选择决策树

```
需要在中断下半部处理任务？
│
├─ 需要在进程上下文执行（可睡眠）？
│  └─ YES → 使用 workqueue
│
├─ 需要在多个 CPU 上并行执行同一任务？
│  └─ YES → 使用 softirq（如网络、块设备）
│
├─ 同一任务只需在一个 CPU 上执行？
│  └─ YES → 使用 tasklet
│
└─ 需要最高性能、最低延迟？
   └─ YES → 使用 softirq（需修改内核）
```

### 使用场景对照

| 场景 | 推荐方案 | 理由 |
|------|----------|------|
| 网络数据包收发 | softirq (NET_TX/RX) | 需要高吞吐量，可多 CPU 并行 |
| 块设备完成回调 | softirq (BLOCK) | 需要高性能，可并行 |
| 定时器处理 | softirq (TIMER) | 内部已使用 |
| 设备驱动中断下半部 | tasklet | 简单高效，单 CPU 执行 |
| 高优先级驱动任务 | tasklet (HI_SOFTIRQ) | 需要更快响应 |
| I2C/SPI 通信 | workqueue | 需要睡眠等待总线 |
| USB 事件处理 | workqueue | 可能涉及复杂操作和睡眠 |
| 延迟初始化 | workqueue | 需要进程上下文 |
| 用户可见的操作 | workqueue | 可以被调度器管理 |

### 注意事项

**softirq：**
- 只能在系统启动早期注册
- 不能睡眠或重新调度
- 适合高频率、低延迟任务

**tasklet：**
- 不能睡眠或重新调度
- 同一 tasklet 不会并发执行，简化同步
- 是驱动中最常用的 bottom half 机制

**workqueue：**
- 可以睡眠，适合涉及 I/O 的操作
- 在进程上下文执行，可以使用信号量等
- 延迟最高，但灵活性最好
- `cancel_work_sync` 可能阻塞，不能在中断上下文调用

### 代码示例：驱动中的典型选择

```c
/* 示例 1：网络驱动 - 使用 softirq（由内核 netif_rx 自动触发） */
static irqreturn_t net_irq_handler(int irq, void *dev_id)
{
    struct net_device *netdev = dev_id;
    struct sk_buff *skb;

    skb = read_packet(netdev);
    skb->protocol = eth_type_trans(skb, netdev);
    netif_rx(skb);  /* 触发 NET_RX_SOFTIRQ */

    return IRQ_HANDLED;
}

/* 示例 2：字符设备驱动 - 使用 tasklet */
static DECLARE_TASKLET(my_tasklet, my_tasklet_handler, 0);

static irqreturn_t char_irq_handler(int irq, void *dev_id)
{
    struct my_device *dev = dev_id;
    dev->data = read_data(dev);
    tasklet_schedule(&my_tasklet);
    return IRQ_HANDLED;
}

/* 示例 3：需要睡眠的操作 - 使用 workqueue */
static struct workqueue_struct *my_wq;
static DECLARE_WORK(my_work, my_work_handler);

static irqreturn_t sensor_irq_handler(int irq, void *dev_id)
{
    struct sensor_dev *dev = dev_id;
    dev->raw_data = read_sensor(dev);
    queue_work(my_wq, &my_work);
    return IRQ_HANDLED;
}
```
