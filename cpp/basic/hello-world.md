# 第一个 C++ 程序

让我们从经典的 "Hello World" 程序开始学习 C++。

## 代码

```cpp
#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
```

## 编译运行

使用 g++ 编译并运行：

```bash
g++ hello.cpp -o hello
./hello
```

输出：

```
Hello, World!
```

## 代码解析

- `#include <iostream>` — 引入输入输出流库
- `int main()` — 程序入口函数
- `std::cout` — 标准输出流
- `return 0;` — 返回 0 表示程序正常结束
