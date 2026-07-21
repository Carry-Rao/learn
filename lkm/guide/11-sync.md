# 同步原语 API

## 头文件

```c
#include <linux/spinlock.h>     // 自旋锁
#include <linux/rwlock.h>       // 读写锁
#include <linux/seqlock.h>      // 顺序锁
#include <linux/mutex.h>        // 互斥体
#include <linux/semaphore.h>    // 信号量
#include <linux/atomic.h>       // 原子操作
#include <linux/bitops.h>       // 位原子操作
#include <linux/rcupdate.h>     // RCU
#include <linux/percpu.h>       // Per-CPU 变量
#include <linux/completion.h>   // 完成量
#include <linux/compiler.h>     // 屏障
```

---

## 1. 自旋锁

### spin_lock / spin_unlock

获取和释放自旋锁，适用于不可睡眠的原子上下文。

```c
void spin_lock(spinlock_t *lock);
void spin_unlock(spinlock_t *lock);
```

| 参数 | 说明 |
|------|------|
| `lock` | 指向 `spinlock_t` 类型的自旋锁指针 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
#include <linux/spinlock.h>

DEFINE_SPINLOCK(my_lock);

void example_func(void)
{
    spin_lock(&my_lock);
    /* 临界区：不能睡眠 */
    /* ✅ 可以：printk(), udelay(), kmalloc(GFP_ATOMIC) */
    /* ❌ 不能：msleep(), schedule(), kmalloc(GFP_KERNEL) */
    spin_unlock(&my_lock);
}
```

### spin_lock_irq / spin_unlock_irq

禁止本地中断后获取自旋锁，释放锁后恢复中断状态。

```c
void spin_lock_irq(spinlock_t *lock);
void spin_unlock_irq(spinlock_t *lock);
```

| 参数 | 说明 |
|------|------|
| `lock` | 指向 `spinlock_t` 类型的自旋锁指针 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
DEFINE_SPINLOCK(my_lock);

irqreturn_t my_handler(int irq, void *dev_id)
{
    spin_lock_irq(&my_lock);
    /* 临界区 */
    spin_unlock_irq(&my_lock);
    return IRQ_HANDLED;
}
```

### spin_lock_irqsave / spin_unlock_irqrestore

保存本地中断状态后禁止中断并获取锁，释放锁后恢复之前的中断状态。比 `spin_lock_irq` 更安全，因为即使之前中断已禁止也能正确工作。

```c
void spin_lock_irqsave(spinlock_t *lock, unsigned long flags);
void spin_unlock_irqrestore(spinlock_t *lock, unsigned long flags);
```

| 参数 | 说明 |
|------|------|
| `lock` | 指向 `spinlock_t` 类型的自旋锁指针 |
| `flags` | `unsigned long` 类型变量，用于保存中断状态 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
DEFINE_SPINLOCK(my_lock);

void example_func(void)
{
    unsigned long flags;

    spin_lock_irqsave(&my_lock, flags);
    /* 临界区 */
    spin_unlock_irqrestore(&my_lock, flags);
}
```

### spin_trylock

尝试获取自旋锁，如果锁已被占用则立即返回，不会自旋等待。

```c
int spin_trylock(spinlock_t *lock);
```

| 参数 | 说明 |
|------|------|
| `lock` | 指向 `spinlock_t` 类型的自旋锁指针 |

| 返回值 | 说明 |
|--------|------|
| `1` | 成功获取锁 |
| `0` | 获取锁失败，锁已被其他执行者持有 |

**使用示例：**

```c
DEFINE_SPINLOCK(my_lock);

void example_func(void)
{
    if (spin_trylock(&my_lock)) {
        /* 成功获取锁 */
        spin_unlock(&my_lock);
    } else {
        /* 获取失败，执行其他操作 */
    }
}
```

### spin_lock_init

动态初始化自旋锁。

```c
void spin_lock_init(spinlock_t *lock);
```

| 参数 | 说明 |
|------|------|
| `lock` | 指向 `spinlock_t` 类型的自旋锁指针 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
spinlock_t my_lock;

void init_func(void)
{
    spin_lock_init(&my_lock);
}
```

---

## 2. 读写锁

### rwlock_t / rwlock_init

读写锁允许多个读者并发访问，但写者独占访问。

```c
typedef struct { ... } rwlock_t;
void rwlock_init(rwlock_t *lock);
```

| 参数 | 说明 |
|------|------|
| `lock` | 指向 `rwlock_t` 类型的读写锁指针 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
DEFINE_RWLOCK(my_rwlock);       /* 静态初始化 */

rwlock_t my_rwlock;             /* 动态声明 */
rwlock_init(&my_rwlock);        /* 动态初始化 */
```

### read_lock / read_unlock

获取和释放读锁，允许多个读者并发持有。

```c
void read_lock(rwlock_t *lock);
void read_unlock(rwlock_t *lock);
```

| 参数 | 说明 |
|------|------|
| `lock` | 指向 `rwlock_t` 类型的读写锁指针 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
DEFINE_RWLOCK(my_rwlock);
int shared_data = 0;

void reader_func(void)
{
    unsigned long flags;
    read_lock_irqsave(&my_rwlock, flags);
    printk(KERN_INFO "data = %d\n", shared_data);
    read_unlock_irqrestore(&my_rwlock, flags);
}
```

### write_lock / write_unlock

获取和释放写锁，写者独占访问，阻塞所有读者和其他写者。

```c
void write_lock(rwlock_t *lock);
void write_unlock(rwlock_t *lock);
```

| 参数 | 说明 |
|------|------|
| `lock` | 指向 `rwlock_t` 类型的读写锁指针 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
DEFINE_RWLOCK(my_rwlock);
int shared_data = 0;

void writer_func(void)
{
    unsigned long flags;
    write_lock_irqsave(&my_rwlock, flags);
    shared_data = 42;
    write_unlock_irqrestore(&my_rwlock, flags);
}
```

---

## 3. 顺序锁

### seqlock_t / seqlock_init

顺序锁通过序列号实现读写分离，读者不阻塞写者，写者修改数据时读者通过重试保证一致性。

```c
typedef struct { ... } seqlock_t;
void seqlock_init(seqlock_t *sl);
```

| 参数 | 说明 |
|------|------|
| `sl` | 指向 `seqlock_t` 类型的顺序锁指针 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
DEFINE_SEQLOCK(my_seqlock);     /* 静态初始化 */

seqlock_t my_seqlock;           /* 动态声明 */
seqlock_init(&my_seqlock);      /* 动态初始化 */
```

### write_seqlock / write_sequnlock

写端操作，写入前递增序列号（变为奇数），写入后再次递增（变为偶数）。

```c
void write_seqlock(seqlock_t *sl);
void write_sequnlock(seqlock_t *sl);
```

| 参数 | 说明 |
|------|------|
| `sl` | 指向 `seqlock_t` 类型的顺序锁指针 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
DEFINE_SEQLOCK(my_seqlock);
int shared_data = 0;

void writer_func(void)
{
    write_seqlock(&my_seqlock);
    shared_data = 42;
    write_sequnlock(&my_seqlock);
}
```

### read_seqbegin / read_seqretry

读端操作，`read_seqbegin` 返回当前序列号，`read_seqretry` 检查读取期间数据是否被修改。

```c
unsigned int read_seqbegin(const seqlock_t *sl);
int read_seqretry(const seqlock_t *sl, unsigned int start);
```

| 参数 | 说明 |
|------|------|
| `sl` | 指向 `seqlock_t` 类型的顺序锁指针 |
| `start` | 由 `read_seqbegin` 返回的序列号 |

| 返回值 | 说明 |
|--------|------|
| `read_seqbegin` | 当前序列号 |
| `read_seqretry` | `0` 表示数据未被修改；非 `0` 表示需要重试 |

**使用示例：**

```c
DEFINE_SEQLOCK(my_seqlock);
int shared_data = 0;

void reader_func(void)
{
    unsigned int seq;
    int data;

    do {
        seq = read_seqbegin(&my_seqlock);
        data = shared_data;
    } while (read_seqretry(&my_seqlock, seq));

    printk(KERN_INFO "data = %d\n", data);
}
```

---

## 4. 互斥体

### DEFINE_MUTEX / mutex_init

静态和动态定义互斥体。

```c
DEFINE_MUTEX(name);
void mutex_init(struct mutex *lock);
```

| 参数 | 说明 |
|------|------|
| `name` | 互斥体变量名（静态） |
| `lock` | 指向 `struct mutex` 类型的互斥体指针（动态） |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
DEFINE_MUTEX(my_mutex);         /* 静态初始化 */

struct mutex my_mutex;          /* 动态声明 */
mutex_init(&my_mutex);          /* 动态初始化 */
```

### mutex_lock / mutex_unlock

获取和释放互斥体，获取失败时会睡眠等待。

```c
void mutex_lock(struct mutex *lock);
void mutex_unlock(struct mutex *lock);
```

| 参数 | 说明 |
|------|------|
| `lock` | 指向 `struct mutex` 类型的互斥体指针 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
DEFINE_MUTEX(my_mutex);

void example_func(void)
{
    mutex_lock(&my_mutex);
    /* 临界区：可以睡眠 */
    /* ✅ 可以：kmalloc(GFP_KERNEL), msleep(), schedule() */
    /* ❌ 不能：在中断上下文中使用 */
    mutex_unlock(&my_mutex);
}
```

### mutex_trylock

尝试获取互斥体，不阻塞。

```c
int mutex_trylock(struct mutex *lock);
```

| 参数 | 说明 |
|------|------|
| `lock` | 指向 `struct mutex` 类型的互斥体指针 |

| 返回值 | 说明 |
|--------|------|
| `1` | 成功获取锁 |
| `0` | 获取锁失败 |

**使用示例：**

```c
DEFINE_MUTEX(my_mutex);

void example_func(void)
{
    if (mutex_trylock(&my_mutex)) {
        /* 成功获取锁 */
        mutex_unlock(&my_mutex);
    } else {
        /* 获取失败 */
    }
}
```

### mutex_is_locked

检查互斥体是否已被持有。

```c
int mutex_is_locked(struct mutex *lock);
```

| 参数 | 说明 |
|------|------|
| `lock` | 指向 `struct mutex` 类型的互斥体指针 |

| 返回值 | 说明 |
|--------|------|
| `1` | 互斥体已被持有 |
| `0` | 互斥体未被持有 |

**使用示例：**

```c
DEFINE_MUTEX(my_mutex);

if (mutex_is_locked(&my_mutex))
    printk(KERN_INFO "mutex is held\n");
else
    printk(KERN_INFO "mutex is free\n");
```

---

## 5. 信号量

### semaphore / sema_init

计数信号量，限制并发访问数量。

```c
struct semaphore {
    raw_spinlock_t lock;
    unsigned int count;
    struct list_head wait_list;
};

void sema_init(struct semaphore *sem, int val);
```

| 参数 | 说明 |
|------|------|
| `sem` | 指向 `struct semaphore` 类型的信号量指针 |
| `val` | 信号量初始计数值 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
DECLARE_MUTEX(my_sem);              /* 计数为 1 的静态声明 */

struct semaphore my_sem;            /* 动态声明 */
sema_init(&my_sem, 3);              /* 计数为 3 */
```

### down / up

`down` 获取信号量（计数减 1），可能睡眠；`up` 释放信号量（计数加 1）。

```c
void down(struct semaphore *sem);
void up(struct semaphore *sem);
```

| 参数 | 说明 |
|------|------|
| `sem` | 指向 `struct semaphore` 类型的信号量指针 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
DECLARE_SEMAPHORE(my_sem, 3);

void example_func(void)
{
    down(&my_sem);
    /* 最多 3 个并发执行者 */
    up(&my_sem);
}
```

### down_trylock

非阻塞方式尝试获取信号量。

```c
int down_trylock(struct semaphore *sem);
```

| 参数 | 说明 |
|------|------|
| `sem` | 指向 `struct semaphore` 类型的信号量指针 |

| 返回值 | 说明 |
|--------|------|
| `0` | 成功获取 |
| `1` | 获取失败 |

**使用示例：**

```c
DECLARE_SEMAPHORE(my_sem, 3);

void example_func(void)
{
    if (down_trylock(&my_sem) == 0) {
        /* 成功获取 */
        up(&my_sem);
    } else {
        /* 获取失败 */
    }
}
```

### down_interruptible

可被信号中断的获取操作。

```c
int down_interruptible(struct semaphore *sem);
```

| 参数 | 说明 |
|------|------|
| `sem` | 指向 `struct semaphore` 类型的信号量指针 |

| 返回值 | 说明 |
|--------|------|
| `0` | 成功获取 |
| `-EINTR` | 被信号中断 |

**使用示例：**

```c
DECLARE_SEMAPHORE(my_sem, 1);

int example_func(void)
{
    if (down_interruptible(&my_sem))
        return -EINTR;      /* 被信号中断 */
    /* 临界区 */
    up(&my_sem);
    return 0;
}
```

---

## 6. 原子操作

### atomic_t

原子整数类型，保证操作的原子性。

```c
typedef struct {
    int counter;
} atomic_t;
```

### atomic_read / atomic_set

读取和设置原子变量的值。

```c
int atomic_read(const atomic_t *v);
void atomic_set(atomic_t *v, int i);
```

| 参数 | 说明 |
|------|------|
| `v` | 指向 `atomic_t` 类型的原子变量指针 |
| `i` | 要设置的整数值 |

| 返回值 | 说明 |
|--------|------|
| `atomic_read` | 当前值 |

**使用示例：**

```c
atomic_t counter = ATOMIC_INIT(0);

atomic_set(&counter, 42);
int val = atomic_read(&counter);  /* val = 42 */
```

### atomic_add / atomic_sub

原子加法和减法。

```c
void atomic_add(int i, atomic_t *v);
void atomic_sub(int i, atomic_t *v);
```

| 参数 | 说明 |
|------|------|
| `i` | 要加/减的整数值 |
| `v` | 指向 `atomic_t` 类型的原子变量指针 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
atomic_t counter = ATOMIC_INIT(0);

atomic_add(10, &counter);   /* counter = 10 */
atomic_sub(3, &counter);    /* counter = 7 */
```

### atomic_inc / atomic_dec

原子递增和递减。

```c
void atomic_inc(atomic_t *v);
void atomic_dec(atomic_t *v);
```

| 参数 | 说明 |
|------|------|
| `v` | 指向 `atomic_t` 类型的原子变量指针 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
atomic_t counter = ATOMIC_INIT(0);

atomic_inc(&counter);   /* counter = 1 */
atomic_inc(&counter);   /* counter = 2 */
atomic_dec(&counter);   /* counter = 1 */
```

### atomic_inc_not_zero

仅在原子变量不为 0 时递增。

```c
int atomic_inc_not_zero(atomic_t *v);
```

| 参数 | 说明 |
|------|------|
| `v` | 指向 `atomic_t` 类型的原子变量指针 |

| 返回值 | 说明 |
|--------|------|
| `1` | 成功递增 |
| `0` | 值为 0，未递增 |

**使用示例：**

```c
atomic_t ref = ATOMIC_INIT(1);

if (atomic_inc_not_zero(&ref))
    printk(KERN_INFO "incremented\n");
else
    printk(KERN_INFO "was zero\n");
```

### atomic_add_return

原子加法并返回新值。

```c
int atomic_add_return(int i, atomic_t *v);
```

| 参数 | 说明 |
|------|------|
| `i` | 要加的整数值 |
| `v` | 指向 `atomic_t` 类型的原子变量指针 |

| 返回值 | 说明 |
|--------|------|
| 加法后的新值 | |

**使用示例：**

```c
atomic_t counter = ATOMIC_INIT(10);

int new_val = atomic_add_return(5, &counter);  /* new_val = 15 */
```

---

## 7. 位原子操作

### set_bit / clear_bit / test_bit

设置、清除和测试指定位。

```c
void set_bit(int nr, volatile unsigned long *addr);
void clear_bit(int nr, volatile unsigned long *addr);
int test_bit(int nr, const volatile unsigned long *addr);
```

| 参数 | 说明 |
|------|------|
| `nr` | 位编号（从 0 开始） |
| `addr` | 指向目标 `unsigned long` 的指针 |

| 返回值 | 说明 |
|--------|------|
| `test_bit` | 位的当前值（`0` 或 `1`） |

**使用示例：**

```c
unsigned long flags = 0;

set_bit(3, &flags);         /* 设置第 3 位 */
clear_bit(3, &flags);       /* 清除第 3 位 */
int bit = test_bit(3, &flags); /* 测试第 3 位 */
```

### test_and_set_bit / test_and_clear_bit

原子地设置/清除指定位并返回旧值。

```c
int test_and_set_bit(int nr, volatile unsigned long *addr);
int test_and_clear_bit(int nr, volatile unsigned long *addr);
```

| 参数 | 说明 |
|------|------|
| `nr` | 位编号（从 0 开始） |
| `addr` | 指向目标 `unsigned long` 的指针 |

| 返回值 | 说明 |
|--------|------|
| 操作前的旧值（`0` 或 `1`） | |

**使用示例：**

```c
unsigned long flags = 0;

int old = test_and_set_bit(0, &flags);   /* old = 0, flags = 1 */
old = test_and_set_bit(0, &flags);       /* old = 1, flags = 1 */
old = test_and_clear_bit(0, &flags);     /* old = 1, flags = 0 */
```

### change_bit

原子地翻转指定位。

```c
void change_bit(int nr, volatile unsigned long *addr);
```

| 参数 | 说明 |
|------|------|
| `nr` | 位编号（从 0 开始） |
| `addr` | 指向目标 `unsigned long` 的指针 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
unsigned long flags = 0;

change_bit(0, &flags);  /* flags: 0 -> 1 */
change_bit(0, &flags);  /* flags: 1 -> 0 */
```

---

## 8. RCU

### rcu_read_lock / rcu_read_unlock

进入和退出 RCU 读端临界区，禁止抢占但不阻塞。

```c
void rcu_read_lock(void);
void rcu_read_unlock(void);
```

| 参数 | 说明 |
|------|------|
| 无 | |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
rcu_read_lock();
struct my_struct *p = rcu_dereference(global_ptr);
if (p)
    do_something(p);
rcu_read_unlock();
```

### rcu_dereference

获取 RCU 保护的指针，配合 `rcu_read_lock` 使用。

```c
#define rcu_dereference(p) ({ ... })
```

| 参数 | 说明 |
|------|------|
| `p` | 由 `rcu_assign_pointer` 赋值的指针 |

| 返回值 | 说明 |
|--------|------|
| 解引用后的指针 | |

**使用示例：**

```c
rcu_read_lock();
struct my_struct *p = rcu_dereference(global_ptr);
/* 安全读取 p */
rcu_read_unlock();
```

### rcu_assign_pointer

写端赋值，带发布语义，确保之前的初始化对读者可见。

```c
#define rcu_assign_pointer(p, v) ({ ... })
```

| 参数 | 说明 |
|------|------|
| `p` | 要赋值的 RCU 保护指针 |
| `v` | 新指针值 |

| 返回值 | 说明 |
|--------|------|
| 赋值后的指针 | |

**使用示例：**

```c
struct my_struct *new = kmalloc(sizeof(*new), GFP_KERNEL);
new->data = 42;
rcu_assign_pointer(global_ptr, new);
```

### synchronize_rcu

阻塞等待所有正在运行的 RCU 读端临界区完成。

```c
void synchronize_rcu(void);
```

| 参数 | 说明 |
|------|------|
| 无 | |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
struct my_struct *old;

void updater_func(void)
{
    struct my_struct *new = kmalloc(sizeof(*new), GFP_KERNEL);
    new->data = 42;

    old = global_ptr;
    rcu_assign_pointer(global_ptr, new);

    synchronize_rcu();      /* 等待所有读者完成 */

    kfree(old);             /* 安全释放旧对象 */
}
```

### call_rcu

异步回调，宽限期结束后调用指定回调函数。

```c
void call_rcu(struct rcu_head *head, void (*func)(struct rcu_head *head));
```

| 参数 | 说明 |
|------|------|
| `head` | `rcu_head` 结构体指针，嵌入在待释放对象中 |
| `func` | 宽限期结束后执行的回调函数 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
struct my_struct {
    struct rcu_head rcu;
    int data;
};

void my_free_cb(struct rcu_head *head)
{
    struct my_struct *p = container_of(head, struct my_struct, rcu);
    kfree(p);
}

void updater_func(void)
{
    struct my_struct *old = global_ptr;
    struct my_struct *new = kmalloc(sizeof(*new), GFP_KERNEL);

    new->data = 42;
    rcu_assign_pointer(global_ptr, new);

    call_rcu(&old->rcu, my_free_cb);
}
```

### kfree_rcu

`call_rcu` 的简化版，直接释放对象。

```c
void kfree_rcu(void *ptr, struct rcu_head *head);
```

| 参数 | 说明 |
|------|------|
| `ptr` | 要释放的对象指针 |
| `head` | 对象内的 `rcu_head` 成员 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
struct my_struct {
    struct rcu_head rcu;
    int data;
};

void updater_func(void)
{
    struct my_struct *old = global_ptr;
    struct my_struct *new = kmalloc(sizeof(*new), GFP_KERNEL);

    new->data = 42;
    rcu_assign_pointer(global_ptr, new);

    kfree_rcu(old, rcu);
}
```

---

## 9. RCU 替代

### SRCU

可睡眠的 RCU 变体，适用于读端临界区需要睡眠的场景。

```c
struct srcu_struct;

int init_srcu_struct(struct srcu_struct *ssp);
void cleanup_srcu_struct(struct srcu_struct *ssp);
int srcu_read_lock(struct srcu_struct *ssp);
void srcu_read_unlock(struct srcu_struct *ssp, int idx);
void synchronize_srcu(struct srcu_struct *ssp);
```

| 参数 | 说明 |
|------|------|
| `ssp` | 指向 `struct srcu_struct` 的指针 |
| `idx` | `srcu_read_lock` 返回的索引值 |

| 返回值 | 说明 |
|--------|------|
| `init_srcu_struct` | `0` 成功，负值失败 |
| `srcu_read_lock` | 整数索引，传递给 `srcu_read_unlock` |

**使用示例：**

```c
DEFINE_SRCU(my_srcu);

void reader_func(void)
{
    int idx = srcu_read_lock(&my_srcu);
    /* 可以睡眠的读端临界区 */
    msleep(100);
    srcu_read_unlock(&my_srcu, idx);
}

void updater_func(void)
{
    synchronize_srcu(&my_srcu);  /* 等待所有 SRCU 读者完成 */
}
```

### Tasks RCU

等待所有非自愿上下文切换完成的 RCU 变体。

```c
void synchronize_rcu_tasks(void);
void call_rcu_tasks(struct rcu_head *head, void (*func)(struct rcu_head *head));
```

| 参数 | 说明 |
|------|------|
| `head` | `rcu_head` 结构体指针 |
| `func` | 回调函数 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
struct my_struct {
    struct rcu_head rcu;
    int data;
};

void my_cb(struct rcu_head *head)
{
    struct my_struct *p = container_of(head, struct my_struct, rcu);
    kfree(p);
}

void cleanup(void)
{
    synchronize_rcu_tasks();
    call_rcu_tasks(&obj->rcu, my_cb);
}
```

---

## 10. Per-CPU 变量

### DEFINE_PER_CPU

静态定义 Per-CPU 变量。

```c
#define DEFINE_PER_CPU(type, name)
```

| 参数 | 说明 |
|------|------|
| `type` | 变量类型 |
| `name` | 变量名 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
DEFINE_PER_CPU(int, counter);
DEFINE_PER_CPU(struct my_struct, percpu_data);
```

### per_cpu

访问指定 CPU 的 Per-CPU 变量副本。

```c
#define per_cpu(var, cpu)
```

| 参数 | 说明 |
|------|------|
| `var` | Per-CPU 变量名 |
| `cpu` | CPU 编号 |

| 返回值 | 说明 |
|--------|------|
| 指向该 CPU 上副本的引用 | |

**使用示例：**

```c
DEFINE_PER_CPU(int, counter);

void read_other_cpu(int cpu)
{
    int val = per_cpu(counter, cpu);
}
```

### get_cpu_var / put_cpu_var

获取当前 CPU 的 Per-CPU 变量并禁止抢占，使用后必须调用 `put_cpu_var` 恢复。

```c
#define get_cpu_var(var)
#define put_cpu_var(var)
```

| 参数 | 说明 |
|------|------|
| `var` | Per-CPU 变量名 |

| 返回值 | 说明 |
|--------|------|
| `get_cpu_var` | 当前 CPU 上副本的左值引用 |

**使用示例：**

```c
DEFINE_PER_CPU(int, counter);

void increment(void)
{
    get_cpu_var(counter)++;
    put_cpu_var(counter);
}
```

### alloc_percpu / free_percpu

动态分配和释放 Per-CPU 变量。

```c
void __percpu *alloc_percpu(type);
void free_percpu(void __percpu *ptr);
```

| 参数 | 说明 |
|------|------|
| `type` | 要分配的类型（`alloc_percpu` 的参数） |
| `ptr` | 之前分配的 Per-CPU 变量指针 |

| 返回值 | 说明 |
|--------|------|
| `alloc_percpu` | 分配的 Per-CPU 指针，失败返回 `NULL` |

**使用示例：**

```c
int __percpu *pcpu_counter;

void init(void)
{
    pcpu_counter = alloc_percpu(int);
    if (!pcpu_counter)
        return -ENOMEM;
}

void cleanup(void)
{
    free_percpu(pcpu_counter);
}

void increment(void)
{
    this_cpu_inc(*pcpu_counter);
}
```

---

## 11. 完成量

### DECLARE_COMPLETION / init_completion

静态和动态定义完成量。

```c
DECLARE_COMPLETION(name);
void init_completion(struct completion *x);
```

| 参数 | 说明 |
|------|------|
| `name` | 完成量变量名（静态） |
| `x` | 指向 `struct completion` 的指针（动态） |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
DECLARE_COMPLETION(done);           /* 静态初始化 */

struct completion done;             /* 动态声明 */
init_completion(&done);             /* 动态初始化 */
```

### complete / complete_all

唤醒等待者。`complete` 唤醒一个，`complete_all` 唤醒所有。

```c
void complete(struct completion *x);
void complete_all(struct completion *x);
```

| 参数 | 说明 |
|------|------|
| `x` | 指向 `struct completion` 的指针 |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
static DECLARE_COMPLETION(done);

void do_work(void)
{
    /* 完成工作后通知 */
    complete(&done);
}
```

### wait_for_completion / wait_for_completion_timeout / reinit_completion

等待完成量被触发。

```c
void wait_for_completion(struct completion *x);
unsigned long wait_for_completion_timeout(struct completion *x, unsigned long timeout);
int wait_for_completion_interruptible(struct completion *x);
void reinit_completion(struct completion *x);
```

| 参数 | 说明 |
|------|------|
| `x` | 指向 `struct completion` 的指针 |
| `timeout` | 超时的 jiffies 数 |

| 返回值 | 说明 |
|--------|------|
| `wait_for_completion` | 无 |
| `wait_for_completion_timeout` | 剩余 jiffies（`0` 表示超时） |
| `wait_for_completion_interruptible` | `0` 或 `-ERESTARTSYS` |

**使用示例：**

```c
static DECLARE_COMPLETION(done);

static int worker_thread(void *data)
{
    msleep(100);
    complete(&done);
    return 0;
}

static int init(void)
{
    kthread_run(worker_thread, NULL, "worker");
    wait_for_completion(&done);
    /* 继续执行 */

    /* 超时等待示例 */
    reinit_completion(&done);
    kthread_run(worker_thread, NULL, "worker");
    unsigned long ret = wait_for_completion_timeout(&done, msecs_to_jiffies(200));
    if (ret == 0)
        printk(KERN_INFO "timeout\n");
    return 0;
}
```

---

## 12. 屏障

### barrier

编译器屏障，阻止编译器跨此点重排指令。

```c
void barrier(void);
```

| 参数 | 说明 |
|------|------|
| 无 | |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
int a = 0, b = 0;

a = 1;
barrier();          /* 编译器不会跨此点重排 */
b = 2;
```

### smp_mb / smp_wmb / smp_rmb

SMP 内存屏障，阻止 CPU 跨此点重排内存操作。

```c
void smp_mb(void);     /* 完整屏障 */
void smp_wmb(void);    /* 写屏障 */
void smp_rmb(void);    /* 读屏障 */
```

| 参数 | 说明 |
|------|------|
| 无 | |

| 返回值 | 说明 |
|--------|------|
| 无 | |

**使用示例：**

```c
int data = 0;
int ready = 0;

/* 生产者 */
data = 42;
smp_wmb();          /* 确保 data 写入先于 ready */
ready = 1;

/* 消费者 */
if (ready) {
    smp_rmb();      /* 确保读取 data 在读取 ready 之后 */
    printk("%d\n", data);
}
```

### smp_store_release / smp_load_acquire

获取-释放语义的原子操作，实现单向内存屏障。

```c
void smp_store_release(void *p, int v);
int smp_load_acquire(void *p);
```

| 参数 | 说明 |
|------|------|
| `p` | 指向要操作的变量 |
| `v` | 要存储的值 |

| 返回值 | 说明 |
|--------|------|
| `smp_load_acquire` | 加载的值 |

**使用示例：**

```c
int data = 0;
int flag = 0;

/* 生产者 */
data = 42;
smp_store_release(&flag, 1);    /* data 写入不会重排到 flag 之后 */

/* 消费者 */
if (smp_load_acquire(&flag)) {  /* data 读取不会重排到 flag 之前 */
    printk("%d\n", data);
}
```

### READ_ONCE / WRITE_ONCE

防止编译器对单次访问进行优化（如合并、拆分），配合内存屏障使用。

```c
#define READ_ONCE(x)
#define WRITE_ONCE(x, val)
```

| 参数 | 说明 |
|------|------|
| `x` | 要读写的变量 |
| `val` | 要写入的值 |

| 返回值 | 说明 |
|--------|------|
| `READ_ONCE` | 变量值 |

**使用示例：**

```c
int flag = 0;
int data = 0;

/* 生产者 */
data = 42;
WRITE_ONCE(flag, 1);

/* 消费者 */
if (READ_ONCE(flag)) {
    printk("%d\n", data);
}
```
