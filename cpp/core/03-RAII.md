# RAII 与智能指针

RAII（Resource Acquisition Is Initialization）是 C++ 管理资源的核心理念：资源在构造时获取，在析构时释放。

## 原始指针的问题

```cpp
void func() {
    int* p = new int[100];
    // ... 如果这里抛出异常或提前 return
    delete[] p;  // 容易忘记
}
```

## unique_ptr

独占所有权，不可复制，可移动。

```cpp
#include <memory>

std::unique_ptr<int> p = std::make_unique<int>(42);
std::unique_ptr<int[]> arr = std::make_unique<int[]>(100);

// 不能拷贝
// auto p2 = p;              // 错误

// 可以移动
auto p2 = std::move(p);     // p 变为空

// 自定义删除器
auto file = std::unique_ptr<FILE, decltype(&fclose)>(
    fopen("test.txt", "r"), &fclose);
```

## shared_ptr

共享所有权，引用计数。

```cpp
std::shared_ptr<int> p1 = std::make_shared<int>(42);
{
    std::shared_ptr<int> p2 = p1;  // 引用计数 +1
}  // p2 析构，引用计数 -1

// p1 析构时引用计数为 0，释放资源
```

## weak_ptr

不影响引用计数，用于打破循环引用。

```cpp
std::shared_ptr<int> sp = std::make_shared<int>(42);
std::weak_ptr<int> wp = sp;

if (auto locked = wp.lock()) {
    std::cout << *locked;  // 使用前检查对象是否存活
}
```

## 原则

- 尽量不用裸 `new` / `delete`
- 优先 `unique_ptr`，需要共享时用 `shared_ptr`
- 工厂函数用 `make_unique` / `make_shared`（更安全、更高效）
