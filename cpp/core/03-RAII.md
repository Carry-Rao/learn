# 构造、析构与 RAII

构造函数在对象创建时调用，析构函数在销毁时调用。RAII 将资源生命周期与对象绑定。

## 构造函数

```cpp
class Student {
private:
    std::string name;
    int age;

public:
    // 默认构造函数
    Student() : name(""), age(0) {}

    // 带参构造函数
    Student(std::string n, int a) : name(n), age(a) {}

    // 初始化列表（推荐）
    // : name(n), age(a) 比函数体内赋值更高效
};

int main() {
    Student s1;               // 默认构造
    Student s2("Alice", 20);  // 带参构造
}
```

如果定义了任何构造函数，编译器不再生成默认构造。`const` 和引用成员必须用初始化列表。

## 析构函数

无参数、无返回值、不可重载。对象离开作用域时自动调用。

```cpp
class Buffer {
private:
    int* data;
public:
    Buffer(int size) : data(new int[size]) {}
    ~Buffer() { delete[] data; }
};
```

## RAII

Resource Acquisition Is Initialization — 资源在构造时获取，在析构时释放。异常安全的基础。

```cpp
void func() {
    int* p = new int[100];
    // 如果这里抛异常，delete 不会执行 → 内存泄漏
    delete[] p;
}

// RAII 版本：资源随对象自动释放
class Wrapper {
    int* data;
public:
    Wrapper(int size) : data(new int[size]) {}
    ~Wrapper() { delete[] data; }
};
```

## 智能指针

标准库的 RAII 封装。

### unique_ptr

独占所有权，不可拷贝，可移动。

```cpp
#include <memory>

std::unique_ptr<int> p = std::make_unique<int>(42);
// auto p2 = p;              // 错误：不可拷贝
auto p2 = std::move(p);     // OK：转移所有权
```

### shared_ptr

共享所有权，引用计数。

```cpp
std::shared_ptr<int> p1 = std::make_shared<int>(42);
{
    std::shared_ptr<int> p2 = p1;  // 引用计数 +1
}  // p2 析构，计数 -1
// p1 析构时计数为 0，释放资源
```

### weak_ptr

不影响引用计数，打破循环引用。

```cpp
std::weak_ptr<int> wp = p1;
if (auto locked = wp.lock()) {
    // 使用 locked
}
```

## 原则

- 优先用 `make_unique` / `make_shared`
- 优先 `unique_ptr`，需要共享时用 `shared_ptr`
- 不用裸 `new` / `delete`
