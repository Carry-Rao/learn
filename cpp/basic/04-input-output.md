# 输入输出

C++ 使用 `std::cin` 和 `std::cout` 进行控制台输入输出。

## 输出 std::cout

```cpp
#include <iostream>

int main() {
    int x = 42;
    std::cout << "x = " << x << std::endl;
    std::cout << "Hello" << " " << "World" << std::endl;
}
```

## 输入 std::cin

```cpp
#include <iostream>

int main() {
    int age;
    std::string name;

    std::cout << "Enter your name: ";
    std::cin >> name;

    std::cout << "Enter your age: ";
    std::cin >> age;

    std::cout << "Hello, " << name << "! You are " << age << " years old." << std::endl;
}
```

## std::cin 的局限

`std::cin >>` 遇到空格会停止读取。读取整行用 `getline`：

```cpp
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::cout << "Enter a sentence: ";
    std::getline(std::cin, line);
    std::cout << "You entered: " << line << std::endl;
}
```

注意：`std::cin >>` 后使用 `getline` 需要先清除换行符：

```cpp
std::cin.ignore();  // 忽略缓冲区中的换行符
```
