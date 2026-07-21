# 内核线程 API

Linux 内核提供了一套完整的内核线程接口，用于在内核空间创建和管理独立执行的线程。这些 API 定义在 `<linux/kthread.h>` 和 `<linux/sched.h>` 中。

---

## 目录

1. [创建线程](#1-创建线程)
2. [线程控制](#2-线程控制)
3. [状态查询](#3-状态查询)
4. [kthread_worker 机制](#4-kthread_worker-机制)
5. [底层 API: kernel_thread](#5-底层-api-kernel_thread)
6. [CPU Hotplug 支持](#6-cpu-hotplug-支持)
7. [停车机制](#7-停车机制)
8. [经典使用模式](#8-经典使用模式)

---

## 1. 创建线程

### kthread_create

动态创建一个内核线程，但**不立即唤醒**。线程处于 `TASK_UNINTERRUPTIBLE` 状态，需要显式唤醒才能运行。

```c
struct task_struct *kthread_create(int (*threadfn)(void *data),
                                   void *data,
                                   const char name_fmt[], ...);
```

**参数：**

| 参数 | 说明 |
|------|------|
| `threadfn` | 线程主函数指针，返回 0 表示线程退出 |
| `data` | 传递给 `threadfn` 的私有数据 |
| `name_fmt` | 线程名称格式化字符串（类似 printf） |

**返回值：**
- 成功：返回 `struct task_struct *` 指针
- 失败：返回 `IS_ERR()` 值，可用 `PTR_ERR()` 获取错误码

**示例：**

```c
#include <linux/kthread.h>
#include <linux/delay.h>

static struct task_struct *my_task;

static int my_thread_fn(void *data)
{
    int count = *(int *)data;

    pr_info("kthread started, count=%d\n", count);

    while (!kthread_should_stop()) {
        pr_info("kthread running...\n");
        msleep(1000);
    }

    pr_info("kthread stopping\n");
    return 0;
}

static int __init my_init(void)
{
    int count = 10;

    my_task = kthread_create(my_thread_fn, &count, "my_thread/%d", 0);
    if (IS_ERR(my_task)) {
        pr_err("Failed to create kthread\n");
        return PTR_ERR(my_task);
    }

    wake_up_process(my_task);
    return 0;
}

static void __exit my_exit(void)
{
    if (my_task)
        kthread_stop(my_task);
}

module_init(my_init);
module_exit(my_exit);
MODULE_LICENSE("GPL");
```

---

### kthread_run

创建并**立即唤醒**一个内核线程。相当于 `kthread_create` + `wake_up_process`。

```c
struct task_struct *kthread_run(int (*threadfn)(void *data),
                                void *data,
                                const char name_fmt[], ...);
```

**参数：** 同 `kthread_create`

**返回值：**
- 成功：返回 `struct task_struct *` 指针
- 失败：返回 `IS_ERR()` 值

**示例：**

```c
#include <linux/kthread.h>

static struct task_struct *my_task;

static int my_thread_fn(void *data)
{
    while (!kthread_should_stop()) {
        pr_info("running...\n");
        msleep(1000);
    }
    return 0;
}

static int __init my_init(void)
{
    /* 直接创建并运行 */
    my_task = kthread_run(my_thread_fn, NULL, "my_worker");
    if (IS_ERR(my_task)) {
        pr_err("Failed to create kthread\n");
        return PTR_ERR(my_task);
    }
    return 0;
}

static void __exit my_exit(void)
{
    if (my_task)
        kthread_stop(my_task);
}

module_init(my_init);
module_exit(my_exit);
MODULE_LICENSE("GPL");
```

---

### kthread_create_on_node

在指定 NUMA 节点上创建内核线程。

```c
struct task_struct *kthread_create_on_node(int (*threadfn)(void *data),
                                           void *data,
                                           int node,
                                           const char name_fmt[], ...);
```

**参数：**

| 参数 | 说明 |
|------|------|
| `node` | 指定的 NUMA 节点编号 |
| 其他 | 同 `kthread_create` |

**返回值：** 同 `kthread_create`

**示例：**

```c
struct task_struct *task;

/* 在 NUMA 节点 0 上创建线程 */
task = kthread_create_on_node(my_thread_fn, my_data, 0, "numa_thread");
if (!IS_ERR(task))
    wake_up_process(task);
```

---

### kthread_create_on_cpu

在指定 CPU 上创建并运行内核线程（用于 CPU hotplug 场景）。

```c
struct task_struct *kthread_create_on_cpu(int (*threadfn)(void *data),
                                          void *data,
                                          int cpu,
                                          const char *name_fmt,
                                          unsigned int cpu_flags);
```

**参数：**

| 参数 | 说明 |
|------|------|
| `cpu` | 目标 CPU 编号 |
| `cpu_flags` | CPU 相关标志位 |
| 其他 | 同 `kthread_create` |

**返回值：** 同 `kthread_create`

**示例：**

```c
static int per_cpu_fn(void *data)
{
    int cpu = smp_processor_id();
    pr_info("running on CPU %d\n", cpu);

    while (!kthread_should_stop())
        schedule();

    return 0;
}

static void create_on_cpu(int cpu)
{
    struct task_struct *task;

    task = kthread_create_on_cpu(per_cpu_fn, NULL, cpu, "per_cpu/%d", 0);
    if (!IS_ERR(task))
        wake_up_process(task);
}
```

---

## 2. 线程控制

### kthread_stop

停止一个内核线程并等待其退出。调用后线程中的 `kthread_should_stop()` 返回 `true`。

```c
int kthread_stop(struct task_struct *k);
```

**参数：**

| 参数 | 说明 |
|------|------|
| `k` | 由 `kthread_create` 或 `kthread_run` 返回的线程描述符 |

**返回值：**
- 成功：线程 `threadfn` 的返回值
- 失败：负错误码（如 `-EINTR` 表示线程被信号中断）

**注意事项：**
- 调用 `kthread_stop` 后，线程函数必须能感知停止请求
- 不能对已停止的线程再次调用 `kthread_stop`

**示例：**

```c
static struct task_struct *worker_task;

static int worker_fn(void *data)
{
    while (!kthread_should_stop()) {
        /* 执行工作 */
        msleep(100);
    }
    pr_info("worker exiting\n");
    return 0;
}

/* 在某个清理路径中 */
int ret = kthread_stop(worker_task);
if (ret == 0)
    pr_info("worker stopped successfully\n");
else
    pr_info("worker stopped with error %d\n", ret);
```

---

### kthread_should_stop

检查当前线程是否应该停止。线程主循环中应定期检查此函数。

```c
bool kthread_should_stop(void);
```

**返回值：**
- `true`：`kthread_stop` 已被调用，线程应当退出
- `false`：线程可以继续运行

**示例：**

```c
static int my_fn(void *data)
{
    /* 简单循环模式 */
    while (!kthread_should_stop()) {
        do_work();
        schedule();  /* 让出 CPU */
    }
    return 0;
}

/* 带条件等待的模式 */
static int my_fn2(void *data)
{
    while (!kthread_should_stop()) {
        set_current_state(TASK_INTERRUPTIBLE);
        if (have_work())
            do_work();
        else
            schedule();
    }
    return 0;
}
```

---

### kthread_park / kthread_unpark

停车机制允许临时挂起内核线程而不销毁它，之后可以恢复。

```c
void kthread_park(struct task_struct *k);
void kthread_unpark(struct task_struct *k);
```

**参数：**

| 参数 | 说明 |
|------|------|
| `k` | 要停车/取消停车的线程描述符 |

**使用场景：** CPU hotplug 时临时停止 per-CPU 线程。

**示例：**

```c
/* CPU 下线时停车 */
static void my_cpu_down(unsigned int cpu)
{
    struct task_struct *task = per_cpu(my_tasks, cpu);
    if (task)
        kthread_park(task);
}

/* CPU 上线时取消停车 */
static void my_cpu_up(unsigned int cpu)
{
    struct task_struct *task = per_cpu(my_tasks, cpu);
    if (task)
        kthread_unpark(task);
}
```

---

### kthread_data

获取创建线程时传递的私有数据。

```c
void *kthread_data(struct task_struct *k);
```

**返回值：** 创建线程时传入的 `data` 指针

**示例：**

```c
struct my_work {
    int id;
    struct list_head list;
};

static int worker_fn(void *data)
{
    struct my_work *work = kthread_data(current);

    pr_info("worker id = %d\n", work->id);
    return 0;
}

static int __init my_init(void)
{
    static struct my_work w = { .id = 42 };
    struct task_struct *task;

    task = kthread_create(worker_fn, &w, "worker");
    if (!IS_ERR(task)) {
        /* kthread_data 可在线程运行前调用 */
        struct my_work *p = kthread_data(task);
        pr_info("data before start: id=%d\n", p->id);
        wake_up_process(task);
    }
    return 0;
}
```

---

### kthread_worker / kthread_worker_fn

用于访问线程的 kthread_worker 结构。

```c
struct kthread_worker *kthread_worker(struct task_struct *k);
```

**返回值：** 关联到该线程的 `struct kthread_worker *`

**示例：** 见 [kthread_worker 机制](#4-kthread_worker-机制) 章节。

---

## 3. 状态查询

### is_kthread_should_stop

检查当前线程是否收到停止请求（与 `kthread_should_stop` 功能相同，但不带函数调用开销的宏实现）。

```c
#define is_kthread_should_stop() (unlikely(kthread_should_stop()))
```

**使用场景：** 在不需要函数调用语义时使用。

---

### kthread_is_running

检查线程是否正在运行。

```c
bool kthread_is_running(struct task_struct *k);
```

**返回值：**
- `true`：线程正在运行
- `false`：线程未运行

**示例：**

```c
if (kthread_is_running(my_task))
    pr_info("thread is active\n");
else
    pr_info("thread is idle or stopped\n");
```

---

### kthread_is_frozen

检查线程是否被冻结（如系统休眠期间）。

```c
bool kthread_is_frozen(struct task_struct *k);
```

**返回值：**
- `true`：线程已被冻结
- `false`：线程未被冻结

**示例：**

```c
static int my_fn(void *data)
{
    while (!kthread_should_stop()) {
        /* 检查是否被冻结 */
        if (kthread_is_frozen(current)) {
            pr_info("thread is frozen, skipping work\n");
            set_current_state(TASK_INTERRUPTIBLE);
            schedule();
            continue;
        }

        do_work();
    }
    return 0;
}
```

---

## 4. kthread_worker 机制

`kthread_worker` 提供了一个生产者-消费者模型，允许向内核线程提交工作项（work item）。

### kthread_init_worker

初始化一个 `kthread_worker` 结构。

```c
void kthread_init_worker(struct kthread_worker *worker);
```

**参数：**

| 参数 | 说明 |
|------|------|
| `worker` | 要初始化的 kthread_worker 结构指针 |

---

### kthread_queue_work

将一个工作项加入 worker 队列。

```c
bool kthread_queue_work(struct kthread_worker *worker,
                        struct kthread_work *work);
```

**参数：**

| 参数 | 说明 |
|------|------|
| `worker` | 目标 worker |
| `work` | 要入队的工作项 |

**返回值：**
- `true`：工作项成功入队
- `false`：工作项已在队列中

---

### kthread_flush_work

等待指定工作项完成执行。

```c
void kthread_flush_work(struct kthread_work *work);
```

**参数：**

| 参数 | 说明 |
|------|------|
| `work` | 要等待完成的工作项 |

---

### kthread_worker_init

使用 kthread_worker_fn 作为线程函数初始化 worker 并创建线程。

```c
struct task_struct *kthread_worker_init(struct kthread_worker *worker,
                                        int (*threadfn)(void *data),
                                        void *data,
                                        const char *name_fmt, ...);
```

**参数：**

| 参数 | 说明 |
|------|------|
| `worker` | 要初始化的 worker |
| `threadfn` | 线程主函数 |
| `data` | 传递给线程的私有数据 |
| `name_fmt` | 线程名称 |

**返回值：** 创建的 `task_struct` 指针

---

### kthread_worker_stop

停止 kthread_worker 并等待其清理完成。

```c
void kthread_worker_stop(struct kthread_worker *worker);
```

**完整示例：**

```c
#include <linux/kthread.h>
#include <linux/delay.h>

static struct kthread_worker my_worker;
static struct task_struct *my_worker_task;
static struct kthread_work my_work1;
static struct kthread_work my_work2;

static void my_work_func(struct kthread_work *work)
{
    pr_info("work item executing on CPU %d\n", smp_processor_id());
    msleep(100);
    pr_info("work item done\n");
}

static int my_worker_fn(void *data)
{
    struct kthread_worker *worker = data;

    /* kthread_worker_fn 内部处理工作项调度 */
    kthread_worker_fn(worker);
    return 0;
}

static int __init my_init(void)
{
    /* 初始化 worker */
    kthread_init_worker(&my_worker);

    /* 创建线程，使用 kthread_worker_fn */
    my_worker_task = kthread_run(my_worker_fn, &my_worker, "my_kworker");
    if (IS_ERR(my_worker_task))
        return PTR_ERR(my_worker_task);

    /* 初始化工作项 */
    kthread_init_work(&my_work1, my_work_func);
    kthread_init_work(&my_work2, my_work_func);

    /* 提交工作 */
    kthread_queue_work(&my_worker, &my_work1);
    kthread_queue_work(&my_worker, &my_work2);

    /* 等待工作完成 */
    kthread_flush_work(&my_work1);
    kthread_flush_work(&my_work2);

    return 0;
}

static void __exit my_exit(void)
{
    kthread_worker_stop(&my_worker);
    kthread_stop(my_worker_task);
}

module_init(my_init);
module_exit(my_exit);
MODULE_LICENSE("GPL");
```

---

## 5. 底层 API: kernel_thread

`kernel_thread` 是最底层的内核线程创建 API，直接创建线程而不经过完整的调度器初始化路径。

```c
pid_t kernel_thread(int (*fn)(void *), void *arg, unsigned long flags,
                    const char *name, ...);
```

**参数：**

| 参数 | 说明 |
|------|------|
| `fn` | 线程函数 |
| `arg` | 传递给线程函数的参数 |
| `flags` | 标志位（如 `CLONE_FS`, `CLONE_FILES` 等） |
| `name` | 线程名称格式化字符串 |

**返回值：**
- 成功：返回线程 PID
- 失败：返回负错误码

**示例：**

```c
static int kernel_thread_fn(void *arg)
{
    int val = *(int *)arg;

    pr_info("kernel_thread running, val=%d\n", val);

    /* 内核线程必须周期性调度 */
    while (!kthread_should_stop()) {
        set_current_state(TASK_INTERRUPTIBLE);
        schedule_timeout(HZ); /* 睡眠 1 秒 */
    }

    return 0;
}

static int __init my_init(void)
{
    static int data = 42;
    pid_t pid;

    /* 注意：kernel_thread 的线程名通常不可靠，建议使用 kthread_create */
    pid = kernel_thread(kernel_thread_fn, &data,
                        CLONE_FS | CLONE_FILES, "k_thread");
    if (pid < 0) {
        pr_err("Failed to create kernel thread\n");
        return pid;
    }

    pr_info("kernel_thread created with pid %d\n", pid);
    return 0;
}

module_init(my_init);
MODULE_LICENSE("GPL");
```

**`flags` 常用值：**

| 标志 | 说明 |
|------|------|
| `CLONE_FS` | 共享 fs_struct |
| `CLONE_FILES` | 共享 files_struct |
| `CLONE_SIGHAND` | 共享信号处理 |
| `CLONE_VM` | 共享地址空间 |

---

## 6. CPU Hotplug 支持

当 CPU 动态上线下线时，内核通过 smpboot 框架自动管理 per-CPU 线程。

### smpboot_register_percpu_thread

注册一个 per-CPU 线程，当 CPU 上线时自动创建对应线程。

```c
int smpboot_register_percpu_thread(struct smpboot_thread_data *percpu);
```

**参数：**

| 参数 | 说明 |
|------|------|
| `percpu` | per-CPU 线程数据结构指针 |

**返回值：**
- `0`：成功
- 负数：错误码

---

### smpboot_unregister_percpu_thread

注销 per-CPU 线程，停止所有 CPU 上的对应线程。

```c
void smpboot_unregister_percpu_thread(struct smpboot_thread_data *percpu);
```

**示例：**

```c
#include <linux/smpboot.h>
#include <linux/sched.h>
#include <linux/delay.h>

static void my_perc_cpu_fn(void *data)
{
    int cpu = smp_processor_id();

    pr_info("per-cpu thread running on CPU %d\n", cpu);

    while (!kthread_should_stop()) {
        set_current_state(TASK_INTERRUPTIBLE);
        schedule_timeout(HZ);
    }

    pr_info("per-cpu thread exiting on CPU %d\n", cpu);
}

static struct smpboot_thread_data my_thread_data = {
    .thread_fn = my_perc_cpu_fn,
    .thread_comm = "my_percpu",
};

static int __init my_init(void)
{
    return smpboot_register_percpu_thread(&my_thread_data);
}

static void __exit my_exit(void)
{
    smpboot_unregister_percpu_thread(&my_thread_data);
}

module_init(my_init);
module_exit(my_exit);
MODULE_LICENSE("GPL");
```

---

## 7. 停车机制

### kthread_busy_loop

在 busy-wait 循环中检查停止请求，用于需要低延迟响应的场景。

```c
void kthread_busy_loop(unsigned int timeout_ms);
```

**参数：**

| 参数 | 说明 |
|------|------|
| `timeout_ms` | 超时时间（毫秒） |

**行为：** 在指定时间内进行忙等循环，定期检查 `kthread_should_stop()`。超时后返回。

**使用场景：** 等待其他 CPU 完成操作时的自旋等待。

**示例：**

```c
static int hotplug_fn(void *data)
{
    while (!kthread_should_stop()) {
        /* 等待某个条件就绪，最多忙等 100ms */
        kthread_busy_loop(100);

        if (kthread_should_stop())
            break;

        do_actual_work();
    }
    return 0;
}
```

**停车/取消停车完整流程示例：**

```c
#include <linux/kthread.h>
#include <linux/cpu.h>

static struct task_struct *my_tasks[NR_CPUS];

static int my_fn(void *data)
{
    int cpu = (long)data;

    while (!kthread_should_stop()) {
        set_current_state(TASK_INTERRUPTIBLE);

        if (kthread_is_frozen(current)) {
            /* 线程被停车，等待取消停车 */
            schedule();
            continue;
        }

        process_data();
        schedule_timeout(HZ);
    }
    return 0;
}

static int __init my_init(void)
{
    int cpu;

    for_each_online_cpu(cpu) {
        my_tasks[cpu] = kthread_create(my_fn, (void *)(long)cpu,
                                        "park_demo/%d", cpu);
        if (!IS_ERR(my_tasks[cpu]))
            wake_up_process(my_tasks[cpu]);
    }
    return 0;
}

static void __exit my_exit(void)
{
    int cpu;

    /* 停车所有线程 */
    for_each_online_cpu(cpu) {
        if (!IS_ERR_OR_NULL(my_tasks[cpu]))
            kthread_park(my_tasks[cpu]);
    }

    /* 确保所有线程不再运行后停止 */
    for_each_online_cpu(cpu) {
        if (!IS_ERR_OR_NULL(my_tasks[cpu]))
            kthread_stop(my_tasks[cpu]);
    }
}

module_init(my_init);
module_exit(my_exit);
MODULE_LICENSE("GPL");
```

---

## 8. 经典使用模式

### 模式一：while + kthread_should_stop + schedule

最基本的内核线程模式，线程定期检查停止请求并让出 CPU。

```c
static struct task_struct *my_task;

static int simple_fn(void *data)
{
    while (!kthread_should_stop()) {
        set_current_state(TASK_INTERRUPTIBLE);
        schedule();  /* 让出 CPU，直到被唤醒 */
    }
    return 0;
}

static int __init init_simple(void)
{
    my_task = kthread_run(simple_fn, NULL, "simple_thread");
    return IS_ERR(my_task) ? PTR_ERR(my_task) : 0;
}

static void __exit exit_simple(void)
{
    kthread_stop(my_task);
}

module_init(init_simple);
module_exit(exit_simple);
MODULE_LICENSE("GPL");
```

### 模式二：while + kthread_should_stop + wait_event

使用等待队列实现事件驱动的内核线程。

```c
#include <linux/wait.h>
#include <linux/sched.h>

static DECLARE_WAIT_QUEUE_HEAD(my_wq);
static bool work_pending;
static DEFINE_SPINLOCK(my_lock);

static struct task_struct *worker_task;

static int worker_fn(void *data)
{
    while (!kthread_should_stop()) {
        wait_event_interruptible(my_wq,
            ({ spin_lock(&my_lock);
               bool ret = work_pending;
               spin_unlock(&my_lock);
               ret; }) || kthread_should_stop());

        if (kthread_should_stop())
            break;

        spin_lock(&my_lock);
        work_pending = false;
        spin_unlock(&my_lock);

        /* 执行实际工作 */
        pr_info("processing work\n");
    }
    return 0;
}

/* 外部提交工作 */
void submit_work(void)
{
    spin_lock(&my_lock);
    work_pending = true;
    spin_unlock(&my_lock);

    wake_up_interruptible(&my_wq);
}

static int __init my_init(void)
{
    worker_task = kthread_run(worker_fn, NULL, "event_worker");
    return IS_ERR(worker_task) ? PTR_ERR(worker_task) : 0;
}

static void __exit my_exit(void)
{
    kthread_stop(worker_task);
}

module_init(my_init);
module_exit(my_exit);
MODULE_LICENSE("GPL");
```

### 模式三：kthread + queue_work（workqueue 混合模式）

使用内核线程 + workqueue 的混合模式，利用内核的 workqueue 基础设施调度工作。

```c
#include <linux/workqueue.h>

static struct task_struct *manager_task;
static struct workqueue_struct *my_wq;
static struct work_struct my_work;

static void my_work_fn(struct work_struct *work)
{
    pr_info("work executed on CPU %d\n", smp_processor_id());
}

static int manager_fn(void *data)
{
    while (!kthread_should_stop()) {
        /* 等待触发 */
        set_current_state(TASK_INTERRUPTIBLE);
        schedule();

        if (kthread_should_stop())
            break;

        /* 通过 workqueue 异步调度工作 */
        queue_work(my_wq, &my_work);
    }
    return 0;
}

static int __init my_init(void)
{
    my_wq = create_singlethread_workqueue("my_workqueue");
    if (!my_wq)
        return -ENOMEM;

    INIT_WORK(&my_work, my_work_fn);

    manager_task = kthread_run(manager_fn, NULL, "manager");
    if (IS_ERR(manager_task)) {
        destroy_workqueue(my_wq);
        return PTR_ERR(manager_task);
    }

    return 0;
}

static void __exit my_exit(void)
{
    kthread_stop(manager_task);
    flush_workqueue(my_wq);
    destroy_workqueue(my_wq);
}

module_init(my_init);
module_exit(my_exit);
MODULE_LICENSE("GPL");
```

### 模式四：kthread_worker（专用工作线程）

使用 kthread_worker 构建专用工作线程，适用于需要精确控制调度时机的场景。

```c
#include <linux/kthread.h>

static struct kthread_worker my_worker;
static struct task_struct *my_worker_task;
static struct kthread_work my_work;

static void do_work_func(struct kthread_work *work)
{
    pr_info("kthread_worker work on CPU %d\n", smp_processor_id());
}

/* 外部调用：提交工作 */
void post_work(void)
{
    kthread_queue_work(&my_worker, &my_work);
}

static int my_worker_fn(void *data)
{
    struct kthread_worker *worker = data;
    kthread_worker_fn(worker);
    return 0;
}

static int __init my_init(void)
{
    kthread_init_worker(&my_worker);
    kthread_init_work(&my_work, do_work_func);

    my_worker_task = kthread_run(my_worker_fn, &my_worker, "kworker");
    if (IS_ERR(my_worker_task))
        return PTR_ERR(my_worker_task);

    /* 立即提交一个工作 */
    post_work();
    return 0;
}

static void __exit my_exit(void)
{
    kthread_worker_stop(&my_worker);
    kthread_stop(my_worker_task);
}

module_init(my_init);
module_exit(my_exit);
MODULE_LICENSE("GPL");
```

---

## 速查表

| API | 用途 | 阻塞 |
|-----|------|------|
| `kthread_create` | 创建线程（不唤醒） | 是 |
| `kthread_run` | 创建并运行线程 | 否 |
| `kthread_create_on_node` | 在指定 NUMA 节点创建 | 是 |
| `kthread_create_on_cpu` | 在指定 CPU 创建 | 否 |
| `kthread_stop` | 停止线程 | 是（等待退出） |
| `kthread_should_stop` | 检查停止请求 | 否 |
| `kthread_park` | 停车线程 | 是 |
| `kthread_unpark` | 取消停车 | 否 |
| `kthread_data` | 获取私有数据 | 否 |
| `kthread_is_running` | 查询运行状态 | 否 |
| `kthread_is_frozen` | 查询冻结状态 | 否 |
| `kthread_init_worker` | 初始化 worker | 否 |
| `kthread_queue_work` | 提交工作项 | 否 |
| `kthread_flush_work` | 等待工作完成 | 是 |
| `kthread_worker_stop` | 停止 worker | 是 |
| `kernel_thread` | 底层线程创建 | 否 |
| `smpboot_register_percpu_thread` | 注册 per-CPU 线程 | 是 |
| `smpboot_unregister_percpu_thread` | 注销 per-CPU 线程 | 是 |
| `kthread_busy_loop` | 忙等循环 | 是 |
