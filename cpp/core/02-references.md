# 引用深入

引用的更深入用法。

## 左值引用

通常说的引用就是左值引用，只能绑定到左值。

```cpp
int x = 10;
int& ref = x;      // OK：x 是左值
int& ref2 = 10;    // 错误：10 是右值
```

## const 引用

可以绑定到右值，延长临时对象的生命周期。

```cpp
const int& r = 10;           // OK
const std::string& s = "hello";  // OK
```

## 右值引用（C++11）

用 `&&` 表示，只能绑定到右值。

```cpp
int&& r = 10;          // OK：10 是右值
r = 20;                // OK：r 本身是左值

int x = 10;
int&& r2 = x;          // 错误：x 是左值
int&& r3 = std::move(x);  // OK：std::move 转为右值
```

## 引用作为函数参数

```cpp
void swap(int& a, int& b) {   // 避免拷贝
    int tmp = a;
    a = b;
    b = tmp;
}

void print(const std::string& s) {  // const 引用：可读不可改
    std::cout << s;
}
```

## 引用作为返回值

```cpp
int& getElement(std::vector<int>& v, int index) {
    return v[index];
}

std::vector<int> v = {1, 2, 3};
getElement(v, 1) = 100;  // 修改 v[1]
```

## 危险：不要返回局部变量的引用

局部变量在函数返回后销毁，返回其引用导致悬垂引用（dangling reference）。

```cpp
int& bad() {
    int x = 42;
    return x;  // x 已销毁，引用无效！
}

auto& r = bad();
std::cout << r;  // 未定义行为
```

指针同理：

```cpp
int* also_bad() {
    int x = 42;
    return &x;  // 悬垂指针
}
```

## 引用类型的重载匹配

函数重载时，不同引用类型匹配不同值类别：

```cpp
void f(int&);        // ① 左值引用
void f(const int&);  // ② const 左值引用
void f(int&&);       // ③ 右值引用
void f(const int&&); // ④ const 右值引用（极少用）
```

匹配规则：

```cpp
int a = 1;
const int b = 2;

f(a);        // ① int&（精确匹配左值）
f(b);        // ② const int&（左值，但 const 只能匹配 ②）
f(1);        // ③ int&&（右值优先匹配右值引用）
f(std::move(a)); // ③ int&&
```

若只定义了 ① 和 ③，调用 `f(b)` 会匹配 ①（`int&` 可绑定到 const？→ 不行），所以实际上会找 ③，但 const 左值不能绑到右值引用。需要 ② 才能匹配 const 左值。

总结：
| 实参 | 匹配优先级 |
|------|-----------|
| 左值 | `T&` > `const T&` |
| const 左值 | `const T&` |
| 右值 | `T&&` > `const T&&` > `const T&` |

## 成员函数的引用限定符（C++11）

成员函数可根据对象是左值还是右值选择重载：

```cpp
struct Widget {
    void process() &;   // 只能由左值对象调用
    void process() &&;  // 只能由右值对象调用
};

Widget w;
w.process();           // 调用 & 版本
std::move(w).process();// 调用 && 版本
```

右值限定版本可以安全地"窃取"资源：

```cpp
struct Buffer {
    std::vector<int> data;

    const std::vector<int>& get() const& { return data; }

    std::vector<int>&& get() && {
        return std::move(data);  // 右值对象返回移动语义
    }
};
```

### 安全做法

- 返回参数中传入的引用（如 `getElement`）
- 返回动态分配的对象（智能指针）
- 返回静态/全局变量（慎用）
- 直接返回值（RVO/移动语义可消除拷贝开销）
