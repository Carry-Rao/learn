# 多线程基础

C++11 标准库提供了跨平台的多线程支持。

## 创建线程

```cpp
#include <iostream>
#include <thread>

void hello() {
    std::cout << "Hello from thread" << std::endl;
}

int main() {
    std::thread t(hello);
    t.join();  // 等待线程结束
    // 或 t.detach() 分离线程，让其后台运行
}
```

## 带参数的线程

```cpp
void print(int a, const std::string& s) {
    std::cout << a << " " << s << std::endl;
}

std::thread t(print, 42, "hello");
t.join();
```

## mutex 互斥锁

```cpp
#include <iostream>
#include <thread>
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

int main() {
    std::thread t1(increment);
    std::thread t2(increment);

    t1.join();
    t2.join();

    std::cout << counter;  // 200000
}
```

## lock_guard

RAII 风格的锁管理，异常安全。

```cpp
void increment() {
    for (int i = 0; i < 100000; i++) {
        std::lock_guard<std::mutex> lock(mtx);
        counter++;
    }  // 自动解锁
}
```

## atomic

对于简单的计数器，可用原子操作代替 mutex。

```cpp
#include <atomic>

std::atomic<int> counter(0);

void increment() {
    for (int i = 0; i < 100000; i++) {
        counter++;
    }
}
```

## 建议

- 优先用 `lock_guard` / `unique_lock` 而非直接 `lock` / `unlock`
- 能用 `atomic` 就不用 `mutex`
- 避免死锁：始终以相同顺序加锁
