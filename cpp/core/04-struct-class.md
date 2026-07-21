# struct 与 class

`struct` 和 `class` 都是定义类型的关键字，**唯一的区别是默认访问权限**。

## struct

数据聚合，成员默认 `public`。

```cpp
#include <iostream>
#include <string>

struct Student {
    std::string name;
    int age;
    double score;
};

int main() {
    Student s1;
    s1.name = "Alice";

    Student s2 = {"Bob", 21, 85.0};  // 聚合初始化

    std::cout << s1.name << " " << s2.score;
}
```

纯数据容器用 `struct`。

## class

封装数据和操作，成员默认 `private`。

```cpp
class BankAccount {
private:
    std::string owner;
    double balance;

public:
    BankAccount(std::string n, double b) : owner(n), balance(b) {}

    void deposit(double amount) { balance += amount; }

    bool withdraw(double amount) {
        if (amount > balance) return false;
        balance -= amount;
        return true;
    }

    double getBalance() const { return balance; }
};
```

## 访问权限

| 关键字 | 访问范围 |
|--------|----------|
| `public` | 任何地方 |
| `private` | 仅类内部 |
| `protected` | 类内部 + 子类 |

## const 成员函数

函数末尾加 `const`，声明不修改成员。只有 `const` 函数可被 `const` 对象调用：

```cpp
double getBalance() const { return balance; }
```

## 成员函数类外定义

```cpp
class Student {
public:
    void introduce() const;
};

void Student::introduce() const {
    std::cout << name;
}
```

## struct vs class

| | struct | class |
|--|--------|-------|
| 默认成员访问 | `public` | `private` |
| 默认继承 | `public` | `private` |
| 用途 | 数据聚合 | 封装 + 行为 |
| 模板参数 | 不可 | 可 |
