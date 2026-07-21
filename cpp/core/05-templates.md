# 模板

模板实现泛型编程：编写与类型无关的代码。

## 函数模板

```cpp
template <typename T>
T max(T a, T b) {
    return a > b ? a : b;
}

int main() {
    std::cout << max(3, 7);        // T = int
    std::cout << max(3.5, 2.1);    // T = double
    std::cout << max('A', 'Z');    // T = char
}
```

## 类模板

```cpp
template <typename T>
class Box {
private:
    T value;
public:
    Box(T v) : value(v) {}
    T get() const { return value; }
    void set(T v) { value = v; }
};

Box<int> intBox(42);
Box<std::string> strBox("hello");
```

## 模板参数

```cpp
template <typename T, int N>
class Array {
    T data[N];
public:
    int size() const { return N; }
};

Array<int, 100> arr;
```

## 模板特化

```cpp
// 通用模板
template <typename T>
T max(T a, T b) { return a > b ? a : b; }

// 特化：处理 const char*
template <>
const char* max<const char*>(const char* a, const char* b) {
    return strcmp(a, b) > 0 ? a : b;
}
```

## 类型推导

C++17 起支持类模板的 CTAD（类模板参数推导）：

```cpp
std::pair p(1, 3.14);   // 自动推导为 pair<int, double>
std::vector v = {1, 2}; // 自动推导为 vector<int>
```
