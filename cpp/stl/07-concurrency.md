# 多线程基础

C++11 标准库提供跨平台线程支持，封装了 pthread（POSIX）或 Windows 线程 API。

## thread

```cpp
#include <thread>

void hello() {
    std::cout << "Hello from thread\n";
}

int main() {
    std::thread t(hello);
    t.join();
}
```

带参数：

```cpp
std::thread t([](int a, std::string s) {
    std::cout << a << " " << s;
}, 42, "hello");
t.join();
```

## 原理：thread 封装 pthread

```cpp
// 简化实现
class thread {
    pthread_t id_;
    bool joinable_;
public:
    template <typename F, typename... Args>
    thread(F&& f, Args&&... args) : joinable_(true) {
        auto p = new std::decay_t<F>(std::forward<F>(f));
        pthread_create(&id_, nullptr, [](void* arg) -> void* {
            (*static_cast<decltype(p)>(arg))();
            delete static_cast<decltype(p)>(arg);
            return nullptr;
        }, p);
    }

    void join() {
        pthread_join(id_, nullptr);
        joinable_ = false;
    }

    void detach() {
        pthread_detach(id_);
        joinable_ = false;
    }

    ~thread() { if (joinable_) std::terminate(); }
};
```

## mutex

```cpp
#include <mutex>

std::mutex mtx;
int counter = 0;

void increment() {
    for (int i = 0; i < 100000; i++) {
        mtx.lock();
        counter++;
        mtx.unlock();
    }
}
```

## lock_guard

RAII 风格的锁：

```cpp
void increment() {
    for (int i = 0; i < 100000; i++) {
        std::lock_guard<std::mutex> lock(mtx);
        counter++;
    }
}
```

### 原理

```cpp
template <typename Mutex>
class lock_guard {
    Mutex& mtx_;
public:
    explicit lock_guard(Mutex& m) : mtx_(m) { mtx_.lock(); }
    ~lock_guard() { mtx_.unlock(); }
    // 不可拷贝/赋值
    lock_guard(const lock_guard&) = delete;
    lock_guard& operator=(const lock_guard&) = delete;
};
```

## unique_lock

比 `lock_guard` 更灵活，可解锁和移动：

```cpp
std::unique_lock<std::mutex> lock(mtx);
// 可手动解锁
lock.unlock();
// 可延迟加锁
std::unique_lock<std::mutex> lock(mtx, std::defer_lock);
lock.lock();
```

## condition_variable

线程间通知：

```cpp
#include <condition_variable>

std::mutex mtx;
std::condition_variable cv;
bool ready = false;

void worker() {
    std::unique_lock<std::mutex> lock(mtx);
    cv.wait(lock, []{ return ready; });  // 等待 ready == true
    // 继续工作
}

void notify() {
    {
        std::lock_guard<std::mutex> lock(mtx);
        ready = true;
    }
    cv.notify_one();  // 或 notify_all()
}
```

## atomic

无锁原子操作：

```cpp
#include <atomic>

std::atomic<int> counter(0);

void increment() {
    for (int i = 0; i < 100000; i++)
        counter++;  // 原子自增，无锁
}
```

### 原理

`atomic` 利用 CPU 提供的原子指令（如 x86 的 `LOCK CMPXCHG`），通常比 mutex 快 10-100 倍。

```cpp
// 简化实现
template <typename T>
class atomic {
    T value_;
public:
    void store(T val, std::memory_order order = std::memory_order_seq_cst) {
        __atomic_store_n(&value_, val, order);
    }
    T load(std::memory_order order = std::memory_order_seq_cst) {
        return __atomic_load_n(&value_, order);
    }
    T fetch_add(T arg) {
        return __atomic_fetch_add(&value_, arg, __ATOMIC_SEQ_CST);
    }
    T operator++() { return fetch_add(1) + 1; }
};
```

当 `T` 很小（如 `int`）且目标平台支持时，`atomic<T>` 是无锁的（`is_lock_free()` 返回 true）。

## 内存序（memory order）

```cpp
std::atomic<int> x{0};

// 宽松：仅保证原子性，不保证顺序
x.store(1, std::memory_order_relaxed);

// 获取-释放：保证因果顺序
x.store(1, std::memory_order_release);
int v = x.load(std::memory_order_acquire);

// 顺序一致性（默认）：全局一致顺序
x.store(1);
```

## 建议

- 优先 `lock_guard` / `unique_lock` 而非裸 `lock/unlock`
- 能用 `atomic` 就不用 `mutex`
- 避免死锁：始终以相同顺序加锁，或用 `std::lock` 同时锁多个 mutex
- `std::async`（`<future>`）也是简单并发手段
