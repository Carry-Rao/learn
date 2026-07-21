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

struct 同样可以有构造函数、成员函数、继承。区别仅在默认访问权限，struct 和 class 完全可以互相替代，C++ 程序员只是按惯例区分：小型的、数据为主的类型用 struct，涉及复杂封装/行为的用 class。

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

## struct vs class

| | struct | class |
|--|--------|-------|
| 默认成员访问 | `public` | `private` |
| 默认继承 | `public` | `private` |
| 惯用场景 | 轻量数据聚合 | 封装 + 行为 |

注意：struct 可以有成员函数、构造函数、继承、模板参数等一切 class 支持的特性。两者在 C++ 中完全等同。
