# 多线程基础

C++11 标准库提供跨平台线程支持。

## thread

```cpp
#include <thread>

void hello() {
    std::cout << "Hello from thread\n";
}

int main() {
    std::thread t(hello);
    t.join();     // 等待线程结束
    // 或 t.detach() 分离，让其后台运行
}
```

带参数：

```cpp
std::thread t([](int a, std::string s) {
    std::cout << a << " " << s;
}, 42, "hello");
t.join();
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

RAII 风格的锁，异常安全：

```cpp
void increment() {
    for (int i = 0; i < 100000; i++) {
        std::lock_guard<std::mutex> lock(mtx);
        counter++;
    }  // 自动解锁
}
```

## atomic

简单计数器用 atomic 替代 mutex，性能更好：

```cpp
#include <atomic>

std::atomic<int> counter(0);

void increment() {
    for (int i = 0; i < 100000; i++)
        counter++;
}
```

## 建议

- 优先 `lock_guard` / `unique_lock` 而非裸 `lock/unlock`
- 能用 `atomic` 就不用 `mutex`
- 避免死锁：始终以相同顺序加锁
