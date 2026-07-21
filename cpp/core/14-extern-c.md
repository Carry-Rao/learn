# extern "C"

`extern "C"` 用于 C++ 中声明具有 C 语言链接的函数。

## 为什么需要

C++ 支持函数重载，编译器会对函数名进行**名字修饰**（name mangling），将参数类型编码到符号中。C 语言没有重载，函数名就是符号名。

```cpp
// C++ 编译后符号名类似 _Z3fooi（因编译器而异）
void foo(int);
void foo(double);

// C 编译后符号名就是 foo
```

`extern "C"` 告诉 C++ 编译器使用 C 的命名方式，不进行名字修饰。

## 调用 C 库

```cpp
// 声明 C 函数链接方式
extern "C" {
    #include <math.h>  // sin, cos 等 C 标准库函数
}

// 或单个函数
extern "C" void* malloc(size_t size);
```

标准库头文件内部已经处理了，通常不需要手动加。

## 被 C 代码调用

当 C++ 函数需要被 C 代码调用时：

```cpp
// C++ 代码
extern "C" void cpp_function(int x) {
    std::cout << x << std::endl;
}
```

这样 `.c` 文件可以直接链接调用 `cpp_function`。

## 头文件中的典型写法

让头文件同时兼容 C 和 C++：

```cpp
// mylib.h
#ifdef __cplusplus
extern "C" {
#endif

void my_func(int x);
int calculate(double a, double b);

#ifdef __cplusplus
}
#endif
```

这样 `.c` 和 `.cpp` 文件都可以 `#include "mylib.h"`。

## 注意事项

- `extern "C"` 内部的函数不能重载（C 风格命名）
- 不能将 `extern "C"` 用于整个命名空间
-  lambda 表达式不能有 C 链接
