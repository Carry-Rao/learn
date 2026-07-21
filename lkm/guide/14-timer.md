# Linux 内核定时器 API 文档

本文档详细介绍 Linux 内核中与定时器相关的 API，包括基础定时器、高精度定时器、延迟执行、时间转换等。

## 目录

1. [内核定时器](#内核定时器)
2. [高精度定时器](#高精度定时器)
3. [延迟执行](#延迟执行)
4. [Tickless/dynticks](#ticklessdynticks)
5. [Jiffies](#jiffies)
6. [时间转换](#时间转换)
7. [延迟工作](#延迟工作)
8. [周期性定时器](#周期性定时器)
9. [内核时间基础](#内核时间基础)

---

## 内核定时器

### timer_list / timer_setup

`timer_list` 是内核中最基础的定时器结构体，用于在指定时间点执行回调函数。

#### 函数签名

```c
struct timer_list {
    struct hlist_node entry;
    unsigned long expires;
    void (*function)(struct timer_list *);
    u32 flags;
#ifdef CONFIG_LOCKDEP
    struct lockdep_map lockdep_map;
#endif
};
```

#### 参数说明

- `entry`: 内部链表节点，用于将定时器加入到活动定时器链表中。
- `expires`: 定时器过期时间，以 jiffies 为单位。
- `function`: 定时器过期时调用的回调函数，参数为 `struct timer_list *`。
- `flags`: 定时器标志位，如 `TIMER_IRQSAFE` 表示回调函数可以在中断上下文中安全调用。

#### 初始化宏

```c
// 静态初始化
#define TIMER_INITIALIZER(_function, _expires, _flags)

// 动态初始化（已废弃）
#define DEFINE_TIMER(_name, _function, _expires, _flags)

// 推荐使用的初始化方式
void timer_setup(struct timer_list *timer, void (*callback)(struct timer_list *), unsigned int flags);
```

#### 使用示例

```c
#include <linux/timer.h>
#include <linux/jiffies.h>

struct my_data {
    int count;
    struct timer_list timer;
};

void my_timer_callback(struct timer_list *t) {
    struct my_data *data = from_timer(data, t, timer);
    pr_info("Timer expired! count: %d\n", data->count);
    data->count++;
    
    // 重新调度定时器（1秒后）
    mod_timer(&data->timer, jiffies + HZ);
}

int my_init_function(void) {
    struct my_data *data = kmalloc(sizeof(*data), GFP_KERNEL);
    
    data->count = 0;
    timer_setup(&data->timer, my_timer_callback, 0);
    mod_timer(&data->timer, jiffies + HZ);
    
    return 0;
}
```

---

### mod_timer

修改已存在定时器的过期时间。

#### 函数签名

```c
int mod_timer(struct timer_list *timer, unsigned long expires);
```

#### 参数说明

- `timer`: 指向要修改的定时器结构体。
- `expires`: 新的过期时间（jiffies）。

#### 返回值

- 返回 1 表示定时器之前已被激活且已修改。
- 返回 0 表示定时器之前未被激活。

#### 使用示例

```c
// 将定时器设置为 500ms 后触发
mod_timer(&my_timer, jiffies + msecs_to_jiffies(500));

// 取消定时器
mod_timer(&my_timer, 0);
```

---

### del_timer

删除定时器。

#### 函数签名

```c
int del_timer(struct timer_list *timer);
```

#### 参数说明

- `timer`: 指向要删除的定时器结构体。

#### 返回值

- 返回 1 表示定时器被成功删除。
- 返回 0 表示定时器已经不在活动列表中。

#### 使用示例

```c
del_timer(&my_timer);
```

---

### del_timer_sync

同步删除定时器，等待正在执行的回调函数完成。

#### 函数签名

```c
int del_timer_sync(struct timer_list *timer);
```

#### 参数说明

- `timer`: 指向要删除的定时器结构体。

#### 返回值

- 返回 1 表示定时器被成功删除或从未被激活。
- 返回 0 表示定时器的回调函数正在执行，删除操作被跳过。

#### 使用示例

```c
// 在模块卸载时调用，确保回调函数不会在模块卸载后继续执行
del_timer_sync(&my_timer);
```

---

### add_timer

激活定时器。

#### 函数签名

```c
void add_timer(struct timer_list *timer);
```

#### 参数说明

- `timer`: 指向要激活的定时器结构体。

#### 使用示例

```c
timer_setup(&my_timer, my_callback, 0);
my_timer.expires = jiffies + HZ;
add_timer(&my_timer);
```

---

### timer_pending

检查定时器是否处于活动状态。

#### 函数签名

```c
int timer_pending(const struct timer_list *timer);
```

#### 参数说明

- `timer`: 指向要检查的定时器结构体。

#### 返回值

- 返回 1 表示定时器已激活。
- 返回 0 表示定时器未被激活。

#### 使用示例

```c
if (timer_pending(&my_timer)) {
    pr_info("Timer is pending\n");
}
```

---

### from_timer

从定时器回调函数的参数中获取包含定时器的数据结构指针。

#### 函数签名

```c
#define from_timer(var, timer_callback_timer, timer_field)
```

#### 参数说明

- `var`: 要获取的数据结构指针变量。
- `timer_callback_timer`: 定时器回调函数的参数（`struct timer_list *`）。
- `timer_field`: 数据结构中定时器成员的名称。

#### 使用示例

```c
struct my_data {
    int value;
    struct timer_list timer;
};

void my_callback(struct timer_list *t) {
    struct my_data *data = from_timer(data, t, timer);
    pr_info("Value: %d\n", data->value);
}
```

---

### DEFINE_TIMER

静态定义并初始化定时器（已废弃，推荐使用 `timer_setup`）。

#### 函数签名

```c
#define DEFINE_TIMER(_name, _function, _expires, _flags)
```

#### 参数说明

- `_name`: 定时器变量名。
- `_function`: 回调函数。
- `_expires`: 过期时间。
- `_flags`: 标志位。

#### 使用示例

```c
DEFINE_TIMER(my_timer, my_callback, jiffies + HZ, 0);
```

---

### hrtimer

高精度定时器结构体（将在高精度定时器部分详细说明）。

---

## 高精度定时器

### hrtimer_init

初始化高精度定时器。

#### 函数签名

```c
void hrtimer_init(struct hrtimer *timer, clockid_t which_clock, enum hrtimer_mode mode);
```

#### 参数说明

- `timer`: 指向要初始化的 hrtimer 结构体。
- `which_clock`: 时钟类型，如 `CLOCK_MONOTONIC`、`CLOCK_REALTIME` 等。
- `mode`: 定时器模式，如 `HRTIMER_MODE_ABS`（绝对时间）或 `HRTIMER_MODE_REL`（相对时间）。

#### 使用示例

```c
struct hrtimer my_hrtimer;
hrtimer_init(&my_hrtimer, CLOCK_MONOTONIC, HRTIMER_MODE_REL);
```

---

### hrtimer_start

启动高精度定时器。

#### 函数签名

```c
int hrtimer_start(struct hrtimer *timer, ktime_t tim, const enum hrtimer_mode mode);
```

#### 参数说明

- `timer`: 指向要启动的 hrtimer 结构体。
- `tim`: 过期时间（ktime_t 类型）。
- `mode`: 定时器模式。

#### 返回值

- 返回 0 表示定时器成功启动。
- 返回非 0 表示定时器已经处于活动状态。

#### 使用示例

```c
ktime_t interval = ktime_set(1, 0); // 1 秒
hrtimer_start(&my_hrtimer, interval, HRTIMER_MODE_REL);
```

---

### hrtimer_cancel

取消高精度定时器。

#### 函数签名

```c
int hrtimer_cancel(struct hrtimer *timer);
```

#### 参数说明

- `timer`: 指向要取消的 hrtimer 结构体。

#### 返回值

- 返回 1 表示定时器被成功取消。
- 返回 0 表示定时器已经不在活动状态。

#### 使用示例

```c
hrtimer_cancel(&my_hrtimer);
```

---

### hrtimer_try_to_cancel

尝试取消高精度定时器。

#### 函数签名

```c

```c
int hrtimer_try_to_cancel(struct hrtimer *timer);
```

#### 参数说明

- `timer`: 指向要取消的 hrtimer 结构体。

#### 返回值

- 返回 1 表示定时器被成功取消。
- 返回 0 表示定时器已经不在活动状态。
- 返回 -1 表示定时器的回调函数正在执行。

#### 使用示例

```c
if (hrtimer_try_to_cancel(&my_hrtimer) == 1) {
    pr_info("Timer cancelled successfully\n");
}
```

---

### ktime_get

获取当前时间（单调时钟）。

#### 函数签名

```c
ktime_t ktime_get(void);
```

#### 返回值

- 返回当前时间（ktime_t 类型）。

#### 使用示例

```c
ktime_t now = ktime_get();
pr_info("Current time: %lld ns\n", ktime_to_ns(now));
```

---

### ktime_add

两个 ktime_t 时间相加。

#### 函数签名

```c
ktime_t ktime_add(const ktime_t lhs, const ktime_t rhs);
```

#### 参数说明

- `lhs`: 第一个时间。
- `rhs`: 第二个时间。

#### 返回值

- 返回相加后的时间。

#### 使用示例

```c
ktime_t start = ktime_get();
ktime_t duration = ktime_set(0, 500000000); // 500ms
ktime_t end = ktime_add(start, duration);
```

---

### ktime_sub

两个 ktime_t 时间相减。

#### 函数签名

```c
ktime_t ktime_sub(const ktime_t lhs, const ktime_t rhs);
```

#### 参数说明

- `lhs`: 被减数。
- `rhs`: 减数。

#### 返回值

- 返回相减后的时间。

#### 使用示例

```c
ktime_t start = ktime_get();
// ... 某些操作 ...
ktime_t end = ktime_get();
ktime_t elapsed = ktime_sub(end, start);
```

---

### ktime_to_ns

将 ktime_t 转换为纳秒。

#### 函数签名

```c
s64 ktime_to_ns(const ktime_t kt);
```

#### 参数说明

- `kt`: 要转换的时间。

#### 返回值

- 返回纳秒数。

#### 使用示例

```c
ktime_t now = ktime_get();
s64 ns = ktime_to_ns(now);
```

---

### ns_to_ktime

将纳秒转换为 ktime_t。

#### 函数签名

```c
ktime_t ns_to_ktime(s64 ns);
```

#### 参数说明

- `ns`: 纳秒数。

#### 返回值

- 返回 ktime_t 时间。

#### 使用示例

```c
ktime_t one_second = ns_to_ktime(1000000000LL);
```

---

## 延迟执行

### msleep

使当前线程休眠指定的毫秒数。

#### 函数签名

```c
unsigned int msleep(unsigned int msecs);
```

#### 参数说明

- `msecs`: 休眠的毫秒数。

#### 返回值

- 返回实际休眠的毫秒数（可能大于请求值）。

#### 使用示例

```c
pr_info("Sleeping for 100ms\n");
msleep(100);
pr_info("Awake!\n");
```

---

### usleep_range

使当前线程休眠指定的微秒范围。

#### 函数签名

```c
void usleep_range(unsigned long min, unsigned long max);
```

#### 参数说明

- `min`: 最小休眠微秒数。
- `max`: 最大休眠微秒数。

#### 使用示例

```c
usleep_range(1000, 2000); // 休眠 1-2 毫秒
```

---

### mdelay

忙等待指定的毫秒数。

#### 函数签名

```c
void mdelay(unsigned long msecs);
```

#### 参数说明

- `msecs`: 忙等待的毫秒数。

#### 使用示例

```c
mdelay(10); // 忙等待 10 毫秒
```

---

### udelay

忙等待指定的微秒数。

#### 函数签名

```c
void udelay(unsigned long usecs);
```

#### 参数说明

- `usecs`: 忙等待的微秒数。

#### 使用示例

```c
udelay(100); // 忙等待 100 微秒
```

---

### ndelay

忙等待指定的纳秒数。

#### 函数签名

```c
void ndelay(unsigned long nsecs);
```

#### 参数说明

- `nsecs`: 忙等待的纳秒数。

#### 使用示例

```c
ndelay(1000); // 忙等待 1 微秒
```

---

### ssleep

使当前线程休眠指定的秒数。

#### 函数签名

```c
unsigned int ssleep(unsigned int secs);
```

#### 参数说明

- `secs`: 休眠的秒数。

#### 返回值

- 返回实际休眠的秒数。

#### 使用示例

```c
ssleep(5); // 休眠 5 秒
```

---

## Tickless/dynticks

### tick_nohz

Tickless 模式相关功能，允许内核在空闲时停止周期性时钟中断以节省功耗。

#### 主要接口

```c
// 检查是否处于 tickless 模式
bool tick_nohz_tick_stopped(void);

// 获取下一个定时器事件的时间
ktime_t tick_nohz_get_next_event(void);

// 进入 tickless 模式
void tick_nohz_idle_enter(void);

// 退出 tickless 模式
void tick_nohz_idle_exit(void);
```

#### 使用示例

```c
if (tick_nohz_tick_stopped()) {
    pr_info("System is in tickless mode\n");
}
```

---

### context_tracking

上下文跟踪功能，用于跟踪用户空间和内核空间的上下文切换。

#### 主要接口

```c
// 检查是否启用上下文跟踪
bool context_tracking_enabled(void);

// 记录用户空间入口
void context_tracking_user_enter(void);

// 记录用户空间出口
void context_tracking_user_exit(void);
```

#### 使用示例

```c
if (context_tracking_enabled()) {
    context_tracking_user_enter();
    // ... 用户空间代码 ...
    context_tracking_user_exit();
}
```

---

## Jiffies

### jiffies / jiffies_64

全局变量，记录自系统启动以来的时钟中断次数。

#### 定义

```c
extern unsigned long volatile jiffies;
extern u64 jiffies_64;
```

#### 使用示例

```c
pr_info("System uptime: %lu jiffies\n", jiffies);
pr_info("64-bit jiffies: %llu\n", jiffies_64);
```

---

### time_after / time_before

比较 jiffies 时间。

#### 函数签名

```c
#define time_after(a, b)  ((long)((b) - (a)) < 0)
#define time_before(a, b) time_after(b, a)
```

#### 使用示例

```c
unsigned long timeout = jiffies + HZ;

if (time_after(jiffies, timeout)) {
    pr_info("Timeout expired\n");
}
```

---

### time_after64 / time_before64

比较 64 位 jiffies 时间。

#### 函数签名

```c
#define time_after64(a, b)  ((long)((b) - (a)) < 0)
#define time_before64(a, b) time_after64(b, a)
```

#### 使用示例

```c
u64 timeout = jiffies_64 + HZ * 1000;

if (time_after64(jiffies_64, timeout)) {
    pr_info("Long timeout expired\n");
}
```

---

### msecs_to_jiffies

将毫秒转换为 jiffies。

#### 函数签名

```c
unsigned int msecs_to_jiffies(const unsigned int m);
```

#### 参数说明

- `m`: 毫秒数。

#### 返回值

- 返回对应的 jiffies 数。

#### 使用示例

```c
unsigned long delay = msecs_to_jiffies(100); // 100ms
mod_timer(&my_timer, jiffies + delay);
```

---

### jiffies_to_msecs

将 jiffies 转换为毫秒。

#### 函数签名

```c
unsigned int jiffies_to_msecs(const unsigned int j);
```

#### 参数说明

- `j`: jiffies 数。

#### 返回值

- 返回对应的毫秒数。

#### 使用示例

```c
unsigned int ms = jiffies_to_msecs(HZ); // 1秒对应的毫秒数
```

---

### usecs_to_jiffies

将微秒转换为 jiffies。

#### 函数签名

```c
unsigned int usecs_to_jiffies(const unsigned int u);
```

#### 参数说明

- `u`: 微秒数。

#### 返回值

- 返回对应的 jiffies 数。

#### 使用示例

```c
unsigned long delay = usecs_to_jiffies(1000); // 1ms
```

---

### jiffies_to_usecs

将 jiffies 转换为微秒。

#### 函数签名

```c
unsigned int jiffies_to_usecs(const unsigned int j);
```

#### 参数说明

- `j`: jiffies 数。

#### 返回值

- 返回对应的微秒数。

#### 使用示例

```c
unsigned int us = jiffies_to_usecs(HZ); // 1秒对应的微秒数
```

---

### nsecs_to_jiffies

将纳秒转换为 jiffies。

#### 函数签名

```c
unsigned long nsecs_to_jiffies(u64 n);
```

#### 参数说明

- `n`: 纳秒数。

#### 返回值

- 返回对应的 jiffies 数。

#### 使用示例

```c
unsigned long delay = nsecs_to_jiffies(1000000000LL); // 1秒
```

---

### HZ

每秒的时钟中断次数（通常为 100、250 或 1000）。

#### 定义

```c
#define HZ 1000 // 常见配置
```

#### 使用示例

```c
pr_info("HZ: %d\n", HZ);
unsigned long one_second = HZ;
```

---

## 时间转换

### ktime_get_boottime

获取系统启动时间（包含休眠时间）。

#### 函数签名

```c
ktime_t ktime_get_boottime(void);
```

#### 返回值

- 返回自系统启动以来的时间。

#### 使用示例

```c
ktime_t boottime = ktime_get_boottime();
pr_info("Boot time: %lld ns\n", ktime_to_ns(boottime));
```

---

### ktime_get_real

获取实际时间（墙上时钟）。

#### 函数签名

```c
ktime_t ktime_get_real(void);
```

#### 返回值

- 返回当前实际时间。

#### 使用示例

```c
ktime_t realtime = ktime_get_real();
pr_info("Real time: %lld ns\n", ktime_to_ns(realtime));
```

---

### ktime_get_ts64

获取高精度时间戳。

#### 函数签名

```c
void ktime_get_ts64(struct timespec64 *ts);
```

#### 参数说明

- `ts`: 指向存储时间戳的结构体。

#### 使用示例

```c
struct timespec64 ts;
ktime_get_ts64(&ts);
pr_info("Time: %lld.%09ld\n", ts.tv_sec, ts.tv_nsec);
```

---

### timespec64

高精度时间结构体。

#### 定义

```c
struct timespec64 {
    time64_t tv_sec;
    long tv_nsec;
};
```

#### 使用示例

```c
struct timespec64 ts = {
    .tv_sec = 100,
    .tv_nsec = 500000000, // 0.5秒
};
```

---

### timeval64

时间值结构体（已废弃）。

#### 定义

```c
struct timeval64 {
    time64_t tv_sec;
    s64 tv_usec;
};
```

#### 使用示例

```c
struct timeval64 tv;
do_gettimeofday64(&tv);
```

---

## 延迟工作

### delayed_work

延迟工作结构体，用于在指定延迟后执行工作队列任务。

#### 定义

```c
struct delayed_work {
    struct work_struct work;
    struct timer_list timer;
    struct workqueue_struct *wq;
    int cpu;
};
```

---

### queue_delayed_work

将延迟工作加入工作队列。

#### 函数签名

```c

```c
bool queue_delayed_work(struct workqueue_struct *wq,
                        struct delayed_work *dwork,
                        unsigned long delay);
```

#### 参数说明

- `wq`: 工作队列指针。
- `dwork`: 延迟工作结构体指针。
- `delay`: 延迟时间（jiffies）。

#### 返回值

- 返回 true 表示工作成功入队。
- 返回 false 表示工作已经在队列中。

#### 使用示例

```c
struct workqueue_struct *my_wq;
struct delayed_work my_dwork;

void my_work_func(struct work_struct *work) {
    struct delayed_work *dwork = to_delayed_work(work);
    pr_info("Delayed work executed\n");
}

int init_function(void) {
    my_wq = create_singlethread_workqueue("my_wq");
    INIT_DELAYED_WORK(&my_dwork, my_work_func);
    
    // 1秒后执行
    queue_delayed_work(my_wq, &my_dwork, HZ);
    return 0;
}
```

---

### cancel_delayed_work_sync

同步取消延迟工作。

#### 函数签名

```c
bool cancel_delayed_work_sync(struct delayed_work *dwork);
```

#### 参数说明

- `dwork`: 要取消的延迟工作结构体指针。

#### 返回值

- 返回 true 表示工作被成功取消。
- 返回 false 表示工作已经在执行或已完成。

#### 使用示例

```c
cancel_delayed_work_sync(&my_dwork);
```

---

### mod_delayed_work

修改延迟工作的延迟时间。

#### 函数签名

```c
bool mod_delayed_work(struct workqueue_struct *wq,
                      struct delayed_work *dwork,
                      unsigned long delay);
```

#### 参数说明

- `wq`: 工作队列指针。
- `dwork`: 延迟工作结构体指针。
- `delay`: 新的延迟时间（jiffies）。

#### 返回值

- 返回 true 表示工作成功修改。
- 返回 false 表示工作已经在执行或已完成。

#### 使用示例

```c
// 修改延迟为 2 秒
mod_delayed_work(my_wq, &my_dwork, HZ * 2);
```

---

## 周期性定时器

### hrtimer_forward

向前推进高精度定时器的过期时间。

#### 函数签名

```c

```c
u64 hrtimer_forward(struct hrtimer *timer, ktime_t now, ktime_t interval);
```

#### 参数说明

- `timer`: 指向要推进的 hrtimer 结构体。
- `now`: 当前时间。
- `interval`: 定时间隔。

#### 返回值

- 返回定时器应该触发的次数。

#### 使用示例

```c
// 在回调函数中重新调度周期性定时器
enum hrtimer_restart my_callback(struct hrtimer *timer) {
    ktime_t now = ktime_get();
    u64 runs = hrtimer_forward(timer, now, ktime_set(1, 0));
    
    // 执行任务
    pr_info("Timer executed %llu times\n", runs);
    
    return HRTIMER_RESTART; // 继续周期性执行
}
```

---

### hrtimer_start_range_ns

启动高精度定时器，指定时间范围。

#### 函数签名

```c
int hrtimer_start_range_ns(struct hrtimer *timer, ktime_t tim,
                          unsigned long delta_ns, const enum hrtimer_mode mode);
```

#### 参数说明

- `timer`: 指向要启动的 hrtimer 结构体。
- `tim`: 目标过期时间。
- `delta_ns`: 允许的时间范围（纳秒）。
- `mode`: 定时器模式。

#### 返回值

- 返回 0 表示定时器成功启动。
- 返回非 0 表示定时器已经处于活动状态。

#### 使用示例

```c
ktime_t target = ktime_add(ktime_get(), ktime_set(1, 0));
hrtimer_start_range_ns(&my_hrtimer, target, 1000000, HRTIMER_MODE_ABS);
```

---

## 内核时间基础

### do_gettimeofday

获取当前时间（已废弃）。

#### 函数签名

```c
void do_gettimeofday(struct timeval *tv);
```

#### 参数说明

- `tv`: 指向存储时间的结构体。

#### 使用示例

```c
struct timeval tv;
do_gettimeofday(&tv);
pr_info("Time: %ld.%06ld\n", tv.tv_sec, tv.tv_usec);
```

---

### getnstimeofday64

获取当前时间的高精度版本。

#### 函数签名

```c
void getnstimeofday64(struct timespec64 *ts);
```

#### 参数说明

- `ts`: 指向存储时间的结构体。

#### 使用示例

```c
struct timespec64 ts;
getnstimeofday64(&ts);
pr_info("Time: %lld.%09ld\n", ts.tv_sec, ts.tv_nsec);
```

---

### ktime_get_mono_fast_ns

快速获取单调时钟时间。

#### 函数签名

```c
u64 ktime_get_mono_fast_ns(void);
```

#### 返回值

- 返回纳秒数。

#### 使用示例

```c
u64 start = ktime_get_mono_fast_ns();
// ... 某些操作 ...
u64 end = ktime_get_mono_fast_ns();
pr_info("Elapsed: %llu ns\n", end - start);
```

---

### local_clock

获取本地 CPU 时钟。

#### 函数签名

```c
unsigned long long local_clock(void);
```

#### 返回值

- 返回纳秒数。

#### 使用示例

```c
unsigned long long start = local_clock();
// ... 某些操作 ...
unsigned long long end = local_clock();
pr_info("Elapsed: %llu ns\n", end - start);
```

---

## 总结

本文档涵盖了 Linux 内核定时器系统的主要 API，包括：

1. **基础定时器** (`timer_list`): 适用于一般的定时任务。
2. **高精度定时器** (`hrtimer`): 适用于需要高精度时间控制的场景。
3. **延迟执行**: 提供简单的休眠和忙等待功能。
4. **Tickless 模式**: 节能的时钟管理机制。
5. **Jiffies**: 内核时间的基本单位。
6. **时间转换**: 不同时间表示之间的转换。
7. **延迟工作**: 工作队列的延迟执行机制。
8. **周期性定时器**: 重复执行的定时器。
9. **内核时间基础**: 获取系统时间的底层接口。

在实际使用中，应根据具体需求选择合适的定时器 API，并注意线程安全和中断上下文的限制。