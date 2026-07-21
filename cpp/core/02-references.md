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

不要返回局部变量的引用！
