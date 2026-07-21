# 原子操作

`<atomic>` 提供无锁的原子类型和操作，用于多线程间的安全共享变量，比 mutex 轻量得多。

## std::atomic

`std::atomic<T>` 对 `T` 提供原子读写和修改操作。

```cpp
#include <atomic>

std::atomic<int> counter{0};

void worker() {
    for (int i = 0; i < 100000; i++)
        counter++;  // 原子自增，无锁
}

std::cout << counter;  // 原子读取
```

### 常用操作

```cpp
std::atomic<int> a{10};

a.store(5);             // 写
int v = a.load();       // 读
v = a.exchange(20);     // 交换并返回旧值

bool ok = a.compare_exchange_weak(v, 30);
// 如果 a == v 则 a = 30，返回 true
// 否则 v = a 的当前值，返回 false

a.fetch_add(3);         // a += 3，返回旧值
a.fetch_sub(2);         // a -= 2
++a;                    // 前置自增
a--;                    // 后置自减
```

### 原理：CPU 原子指令

`atomic` 底层利用 CPU 提供的原子指令，如 x86 的 `LOCK` 前缀：

```cpp
// x86 上 atomic::fetch_add 大致对应：
// lock xadd [addr], eax

// 简化实现示意
template <typename T>
T atomic<T>::fetch_add(T arg) noexcept {
    return __atomic_fetch_add(&value_, arg, __ATOMIC_SEQ_CST);
}
```

GCC/Clang 的 `__atomic_*` 内建函数编译器会直接生成对应 CPU 指令。如果目标平台不支持某类型的原子操作，退而使用锁（`is_lock_free()` 返回 false）。

## 无锁检测

```cpp
std::atomic<int> a;
std::cout << a.is_lock_free();  // 通常 true

struct Big { int data[64]; };
std::atomic<Big> big;
std::cout << big.is_lock_free(); // 通常 false（用内部 mutex）
```

## std::atomic_flag

最简原子类型，保证总是无锁，用于自旋锁。

```cpp
class SpinLock {
    std::atomic_flag flag = ATOMIC_FLAG_INIT;
public:
    void lock() {
        while (flag.test_and_set(std::memory_order_acquire))
            ;  // 自旋等待
    }
    void unlock() {
        flag.clear(std::memory_order_release);
    }
};
```

## 内存序（memory_order）

原子操作可指定内存序，控制不同线程间的可见性。从松到严：

### memory_order_relaxed

仅保证原子性，不保证顺序：

```cpp
std::atomic<int> x{0}, y{0};

// 线程 1
x.store(1, std::memory_order_relaxed);
y.store(2, std::memory_order_relaxed);

// 线程 2
// 可能看到 y=2 但 x=0！
```

### memory_order_release / memory_order_acquire

保证因果关系：release 之前的所有写入，在 acquire 之后可见：

```cpp
std::atomic<bool> ready{false};
std::string data;

// 线程 1（生产者）
data = "hello";
ready.store(true, std::memory_order_release);

// 线程 2（消费者）
if (ready.load(std::memory_order_acquire))
    std::cout << data;  // 一定看到 "hello"
```

### memory_order_acq_rel

RMW 操作（如 `fetch_add`、`CAS`）使用，兼具 acquire 和 release。

### memory_order_seq_cst（默认）

全局一致顺序，所有线程看到相同操作顺序，性能开销最大。

```cpp
x.store(1);                    // 默认 seq_cst
x.store(1, std::memory_order_seq_cst);
```

### 对比

| 内存序 | 开销 | 保证 |
|--------|------|------|
| `relaxed` | 无额外屏障 | 仅原子性 |
| `acquire`/`release` | 单向屏障 | 因果关系 |
| `acq_rel` | 双向屏障 | RMW 的因果 |
| `seq_cst` | 全屏障 | 全局一致序 |

## Compare-and-Swap（CAS）

CAS 是实现无锁数据结构的基础：

```cpp
std::atomic<int> a{10};
int expected = 10;

// weak：可能伪失败（spurious failure），循环中使用
while (!a.compare_exchange_weak(expected, 20))
    ;  // expected 已被更新，重试

// strong：无伪失败，一次即可
bool ok = a.compare_exchange_strong(expected, 30);
```

CAS 原理对应 CPU 指令 `LOCK CMPXCHG`（x86）：

```cpp
// x86: lock cmpxchg [addr], reg
// 比较 [addr] 与 eax，相等则写入 reg，否则 [addr] 写入 eax
```

## std::atomic_ref（C++20）

对非原子对象进行原子操作，避免拷贝：

```cpp
int x = 0;
std::atomic_ref<int> ref(x);
ref.store(5);       // 原子写入 x
```

## 原理：缓存一致性

现代 CPU 使用缓存一致性协议（如 MESI）保证核间同步。原子操作的核心机制：

1. **缓存锁定**：`LOCK` 前缀锁住缓存行，阻止其他核访问
2. **屏障指令**：`MFENCE` 等指令强制内存操作完成并刷新缓存
3. **缓存一致性协议**：MESI（Modified/Exclusive/Shared/Invalid）状态机保证数据一致性

## 建议

- 简单计数器用 `atomic` > mutex
- 默认用 `seq_cst`，性能敏感时再考虑放宽
- `atomic<int>`/`atomic<bool>` 通常无锁，复杂类型不一定
- 复杂同步逻辑优先用 mutex，无锁编程容易出错
- 优先 `lock_guard` / `scoped_lock` 而非裸 `lock/unlock`
- 避免死锁：始终以相同顺序加锁，或用 `scoped_lock`
- `std::async`（`<future>`）也是简单并发手段

## mutex

`std::mutex` 提供互斥访问，是 pthread_mutex 的 RAII 封装。

### mutex 原理

```cpp
// 简化实现
class mutex {
    pthread_mutex_t mtx_;
public:
    mutex() { pthread_mutex_init(&mtx_, nullptr); }
    void lock() { pthread_mutex_lock(&mtx_); }
    void unlock() { pthread_mutex_unlock(&mtx_); }
    ~mutex() { pthread_mutex_destroy(&mtx_); }
};
```

不同平台的底层实现：
- Linux：`futex`（fast userspace mutex），无竞争时在用户态自旋，不陷入内核
- Windows：`CRITICAL_SECTION` + `SRWLOCK`
- macOS：`pthread_mutex` 或 `os_unfair_lock`

futex 原理：用户态原子操作尝试加锁，失败时通过系统调用休眠，避免忙等。

## lock_guard

RAII 锁，构造时加锁，析构时解锁：

```cpp
std::mutex mtx;

void safe_increment() {
    std::lock_guard<std::mutex> lock(mtx);
    // 临界区
    counter++;
}  // 自动 unlock
```

### 原理

```cpp
template <typename Mutex>
class lock_guard {
    Mutex& mtx_;
public:
    explicit lock_guard(Mutex& m) : mtx_(m) { mtx_.lock(); }
    ~lock_guard() { mtx_.unlock(); }
    lock_guard(const lock_guard&) = delete;
    lock_guard& operator=(const lock_guard&) = delete;
};
```

## unique_lock

比 `lock_guard` 更灵活，可延迟加锁、提前解锁、转移所有权：

```cpp
std::unique_lock<std::mutex> lock(mtx);               // 立即加锁

std::unique_lock<std::mutex> lock(mtx, std::defer_lock);  // 延迟
lock.lock();

std::unique_lock<std::mutex> lock(mtx, std::try_to_lock); // 尝试
if (lock.owns_lock()) { /* ... */ }

lock.unlock();  // 提前解锁
```

`condition_variable` 要求 `unique_lock`，因为 wait 内部需要解锁和重加锁。

## scoped_lock（C++17）

一次性锁定多个 mutex，避免死锁：

```cpp
std::mutex m1, m2;

void transfer() {
    std::scoped_lock lock(m1, m2);  // 同时锁两个
    // 安全操作共享资源
}  // 自动解锁
```

等价于 `std::lock(m1, m2)` + `lock_guard`，底层使用死锁避免算法（如按地址排序加锁）。

## 条件变量

```cpp
#include <condition_variable>

std::mutex mtx;
std::condition_variable cv;
bool ready = false;

void worker() {
    std::unique_lock<std::mutex> lock(mtx);
    cv.wait(lock, []{ return ready; });  // 等价于 while(!ready) cv.wait(lock);
    // ready == true，继续工作
}

void notify() {
    {
        std::lock_guard<std::mutex> lock(mtx);
        ready = true;
    }
    cv.notify_one();  // 或 notify_all()
}
```

### 原理

`condition_variable` 封装 pthread_cond_t：

```cpp
// 简化实现
class condition_variable {
    pthread_cond_t cv_;
public:
    condition_variable() { pthread_cond_init(&cv_, nullptr); }

    void wait(std::unique_lock<std::mutex>& lock) {
        // 原子地：解锁 mutex + 休眠等待唤醒
        pthread_cond_wait(&cv_, lock.mutex()->native_handle());
        // 被唤醒后重新加锁
    }

    void notify_one() { pthread_cond_signal(&cv_); }
    void notify_all() { pthread_cond_broadcast(&cv_); }

    ~condition_variable() { pthread_cond_destroy(&cv_); }
};
```

关键行为：
1. `wait` 原子性地解锁 mutex 并休眠
2. 被 `notify` 唤醒后，在返回前重新加锁
3. 虚假唤醒（spurious wakeup）可能发生，因此需要 while 循环或谓词重载
