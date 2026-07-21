# vector

`std::vector` 是动态数组，长度可自动扩展，元素连续存储在堆上。

## 基本用法

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v;

    v.push_back(10);
    v.push_back(20);
    v.push_back(30);

    std::cout << "Size: " << v.size() << std::endl;     // 3
    std::cout << "First: " << v[0] << std::endl;        // 10
    std::cout << "Last: " << v.back() << std::endl;      // 30

    for (int i = 0; i < v.size(); i++) {
        std::cout << v[i] << " ";
    }

    for (int x : v) {
        std::cout << x << " ";
    }
}
```

## 常用操作

```cpp
std::vector<int> v;

v.push_back(x);     // 末尾添加
v.pop_back();       // 删除末尾
v.size();           // 元素个数
v.empty();          // 是否为空
v.clear();          // 清空
v.front();          // 第一个元素
v.back();           // 最后一个元素
v.at(i);            // 带越界检查的访问
v.resize(n);        // 重新设置大小
v.capacity();       // 当前容量
v.reserve(n);       // 预留容量
```

## 原理：动态数组

`vector` 内部通过三个指针（或等价物）管理：

```
[T][T][T][ ][ ][ ]  // size=3, capacity=6
 ↑       ↑       ↑
begin   end     reserved
```

- `begin`：数据起始
- `end`：最后一个元素之后
- `reserved`：分配的内存末尾

### 扩容（growth）

当 `size == capacity` 时，`push_back` 触发扩容：
1. 分配新内存（通常为原容量的 **1.5x 或 2x**，各实现不同）
2. 移动/拷贝旧元素到新内存
3. 释放旧内存

```cpp
void push_back(const T& val) {
    if (size_ == capacity_) {
        size_t new_cap = capacity_ == 0 ? 1 : capacity_ * 2;
        reserve(new_cap);
    }
    data_[size_++] = val;
}
```

### 简单实现

```cpp
template <typename T>
class vector {
    T* data_;
    size_t size_;
    size_t capacity_;
public:
    vector() : data_(nullptr), size_(0), capacity_(0) {}

    void push_back(const T& val) {
        if (size_ == capacity_) {
            size_t new_cap = capacity_ == 0 ? 1 : capacity_ * 2;
            T* new_data = new T[new_cap];
            for (size_t i = 0; i < size_; i++)
                new_data[i] = data_[i];
            delete[] data_;
            data_ = new_data;
            capacity_ = new_cap;
        }
        data_[size_++] = val;
    }

    void pop_back() { --size_; }

    T& operator[](size_t i) { return data_[i]; }
    size_t size() const { return size_; }
    size_t capacity() const { return capacity_; }
    bool empty() const { return size_ == 0; }

    ~vector() { delete[] data_; }
};
```

## 初始化

```cpp
std::vector<int> v1;                 // 空
std::vector<int> v2(5);              // 5 个 0
std::vector<int> v3(5, 10);          // 5 个 10
std::vector<int> v4 = {1, 2, 3};     // 列表初始化（C++11）
```

## 二维 vector

```cpp
std::vector<std::vector<int>> matrix(3, std::vector<int>(4, 0));
```

## 复杂度

| 操作 | 复杂度 |
|------|--------|
| 随机访问 `[]`, `at()` | O(1) |
| 末尾插入 `push_back` | 均摊 O(1) |
| 中间插入/删除 | O(n) |
| 查找 | O(n) |
