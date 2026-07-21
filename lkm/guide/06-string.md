# 字符串与数据操作 API

## 头文件

```c
#include <linux/string.h>      // 字符串操作函数
#include <linux/kernel.h>      // snprintf, kasprintf 等
#include <linux/bitmap.h>      // bitmap 操作
#include <linux/byteorder/generic.h>  // 大小端转换
#include <linux/bitops.h>      // 位操作函数
#include <linux/minmax.h>      // min/max 宏
#include <linux/compiler.h>    // likely/unlikely
#include <linux/printk.h>      // print_hex_dump
```

---

## 基本字符串

### strlcpy / strlcat

安全复制/连接字符串，保证 null 结尾，返回目标字符串长度（不含 null）。

```c
size_t strlcpy(char *dest, const char *src, size_t size);
size_t strlcat(char *dest, const char *src, size_t size);
```

| 参数 | 说明 |
|------|------|
| `dest` | 目标缓冲区 |
| `src` | 源字符串 |
| `size` | 目标缓冲区总大小（含 null） |
| 返回值 | `strlcpy` 返回 `strlen(src)`；`strlcat` 返回 `strlen(dest) + strlen(src)` |

```c
char buf[16];
size_t ret;

ret = strlcpy(buf, "hello", sizeof(buf));  // ret = 5, buf = "hello\0..."
ret = strlcat(buf, " world", sizeof(buf)); // ret = 11, buf = "hello world\0..."
```

### strcat / strncat

连接字符串到目标末尾。

```c
char *strcat(char *dest, const char *src);
char *strncat(char *dest, const char *src, size_t n);
```

| 参数 | 说明 |
|------|------|
| `dest` | 目标字符串（需已 null 结尾） |
| `src` | 源字符串 |
| `n` | 最多连接 `n` 个字符 |
| 返回值 | 指向 `dest` 的指针 |

```c
char buf[32] = "hello";
strcat(buf, " world");      // buf = "hello world"
strncat(buf, "!!!", 1);     // buf = "hello world!"
```

### strcpy / strncpy

复制字符串。

```c
char *strcpy(char *dest, const char *src);
char *strncpy(char *dest, const char *src, size_t n);
```

| 参数 | 说明 |
|------|------|
| `dest` | 目标缓冲区 |
| `src` | 源字符串 |
| `n` | 最多复制 `n` 个字符 |
| 返回值 | 指向 `dest` 的指针 |

注意：`strncpy` 不保证 null 结尾，若 `src` 长度 >= `n`，需手动添加 `\0`。

```c
char buf[16];
strcpy(buf, "hello");
strncpy(buf, "long string", sizeof(buf) - 1);
buf[sizeof(buf) - 1] = '\0';
```

### strcmp / strncmp

比较字符串。

```c
int strcmp(const char *s1, const char *s2);
int strncmp(const char *s1, const char *s2, size_t n);
```

| 参数 | 说明 |
|------|------|
| `s1`, `s2` | 待比较字符串 |
| `n` | 最多比较 `n` 个字符 |
| 返回值 | 相等返回 0，`s1 < s2` 返回负数，`s1 > s2` 返回正数 |

```c
if (strcmp(a, b) == 0) { /* 相等 */ }
if (strncmp(a, b, 3) == 0) { /* 前 3 个字符相等 */ }
```

### strlen / strnlen

获取字符串长度。

```c
size_t strlen(const char *s);
size_t strnlen(const char *s, size_t maxlen);
```

| 参数 | 说明 |
|------|------|
| `s` | 字符串 |
| `maxlen` | 最大检查长度 |
| 返回值 | 字符串长度（不含 null） |

```c
size_t len = strlen("hello");          // len = 5
size_t len2 = strnlen("hello", 3);    // len2 = 3
```

---

## 高级字符串

### strchr / strrchr / strnchr

查找字符在字符串中首次/末次出现的位置。

```c
char *strchr(const char *s, int c);
char *strrchr(const char *s, int c);
char *strnchr(const char *s, size_t n, int c);
```

| 参数 | 说明 |
|------|------|
| `s` | 字符串 |
| `c` | 要查找的字符（转换为 `int`） |
| `n` | 最多检查 `n` 个字符 |
| 返回值 | 找到返回指向该字符的指针，未找到返回 `NULL` |

```c
char *p = strchr("hello", 'l');  // p 指向第一个 'l'
char *q = strrchr("hello", 'l'); // q 指向最后一个 'l'
```

### strsep

按分隔符分割字符串。

```c
char *strsep(char **stringp, const char *delim);
```

| 参数 | 说明 |
|------|------|
| `stringp` | 指向待分割字符串的指针的指针 |
| `delim` | 分隔符字符串 |
| 返回值 | 分割出的子串，无更多子串返回 `NULL` |

```c
char *str = "one,two,three";
char *token;
while ((token = strsep(&str, ",")) != NULL) {
    // token 依次为 "one", "two", "three"
}
```

### strpbrk

查找字符串中第一个属于指定字符集的字符。

```c
char *strpbrk(const char *s, const char *accept);
```

| 参数 | 说明 |
|------|------|
| `s` | 字符串 |
| `accept` | 字符集 |
| 返回值 | 指向第一个匹配字符的指针，未找到返回 `NULL` |

```c
char *p = strpbrk("hello world", "aeiou");  // p 指向 'e'
```

### strstr

查找子串。

```c
char *strstr(const char *haystack, const char *needle);
```

| 参数 | 说明 |
|------|------|
| `haystack` | 被搜索字符串 |
| `needle` | 要查找的子串 |
| 返回值 | 指向子串首次出现位置的指针，未找到返回 `NULL` |

```c
char *p = strstr("hello world", "world");  // p 指向 "world"
```

### strspn / strcspn

计算字符串前缀中连续属于/不属于指定字符集的字符数。

```c
size_t strspn(const char *s, const char *accept);
size_t strcspn(const char *s, const char *reject);
```

| 参数 | 说明 |
|------|------|
| `s` | 字符串 |
| `accept` | 允许字符集 |
| `reject` | 拒绝字符集 |
| 返回值 | 连续匹配的字符数 |

```c
size_t n = strspn("123abc", "0123456789");  // n = 3
size_t m = strcspn("hello", "aeiou");       // m = 0（第一个字符 'h' 不在元音集中）
```

---

## 格式化输出

### snprintf / scnprintf

格式化字符串输出到缓冲区。

```c
int snprintf(char *buf, size_t size, const char *fmt, ...);
int scnprintf(char *buf, size_t size, const char *fmt, ...);
```

| 参数 | 说明 |
|------|------|
| `buf` | 目标缓冲区 |
| `size` | 缓冲区大小 |
| `fmt` | 格式字符串 |
| 返回值 | 写入的字符数（不含 null） |

`snprintf` 保证 null 结尾；`scnprintf` 不自动添加 null，适合多次追加。

```c
char buf[64];
int len = snprintf(buf, sizeof(buf), "value: %d", 42);
int len2 = scnprintf(buf, sizeof(buf), "value: %d", 42);
```

### kasprintf / kvasprintf

内核动态分配格式化字符串。

```c
char *kasprintf(gfp_t gfp, const char *fmt, ...);
char *kvasprintf(gfp_t gfp, const char *fmt, va_list args);
```

| 参数 | 说明 |
|------|------|
| `gfp` | 内存分配标志（如 `GFP_KERNEL`） |
| `fmt` | 格式字符串 |
| `args` | `va_list` 参数 |
| 返回值 | 成功返回分配的字符串，失败返回 `NULL` |

```c
char *str = kasprintf(GFP_KERNEL, "pid: %d", task->pid);
if (!str)
    return -ENOMEM;
// 使用 str
kfree(str);
```

### vscnprintf

`va_list` 版本的 `scnprintf`。

```c
int vscnprintf(char *buf, size_t size, const char *fmt, va_list args);
```

| 参数 | 说明 |
|------|------|
| `buf` | 目标缓冲区 |
| `size` | 缓冲区大小 |
| `fmt` | 格式字符串 |
| `args` | `va_list` 参数 |
| 返回值 | 写入的字符数（不含 null） |

```c
va_list args;
va_start(args, fmt);
int len = vscnprintf(buf, sizeof(buf), fmt, args);
va_end(args);
```

---

## 整数转换

### kstrtoul / kstrtoull / kstrtol

字符串转无符号/有符号长整数。

```c
int kstrtoul(const char *s, unsigned int base, unsigned long *res);
int kstrtoull(const char *s, unsigned int base, unsigned long long *res);
int kstrtol(const char *s, unsigned int base, long *res);
```

| 参数 | 说明 |
|------|------|
| `s` | 输入字符串 |
| `base` | 进制（0 表示自动检测） |
| `res` | 结果指针 |
| 返回值 | 成功返回 0，失败返回 `-EINVAL` 或 `-ERANGE` |

```c
unsigned long val;
if (kstrtoul("12345", 10, &val) == 0) {
    // val = 12345
}
```

### kstrtoint / kstrtou8 / kstrtou16 / kstrtou32 / kstrto8 / kstrto16 / kstrto32

字符串转整数的便捷版本。

```c
int kstrtoint(const char *s, unsigned int base, int *res);
int kstrtou8(const char *s, unsigned int base, u8 *res);
int kstrtou16(const char *s, unsigned int base, u16 *res);
int kstrtou32(const char *s, unsigned int base, u32 *res);
int kstrto8(const char *s, unsigned int base, s8 *res);
int kstrto16(const char *s, unsigned int base, s16 *res);
int kstrto32(const char *s, unsigned int base, s32 *res);
```

```c
u32 port;
if (kstrtou32("8080", 10, &port) == 0) {
    // port = 8080
}
```

---

## 内存操作

### memset / memcpy / memmove / memcmp

```c
void *memset(void *s, int c, size_t n);
void *memcpy(void *dest, const void *src, size_t n);
void *memmove(void *dest, const void *src, size_t n);
int memcmp(const void *s1, const void *s2, size_t n);
```

| 参数 | 说明 |
|------|------|
| `s`, `dest` | 目标内存 |
| `src` | 源内存 |
| `c` | 填充值 |
| `n` | 操作字节数 |
| 返回值 | `memcmp`：相等返回 0，否则返回差值；其他返回目标指针 |

`memmove` 可处理重叠区域。

```c
memset(buf, 0, sizeof(buf));
memcpy(dst, src, len);
memmove(buf + 4, buf, len);  // 重叠安全
if (memcmp(a, b, len) == 0) { /* 相等 */ }
```

### memscan / memchr

在内存中搜索字节。

```c
void *memscan(void *s, int c, size_t n);
void *memchr(const void *s, int c, size_t n);
```

| 参数 | 说明 |
|------|------|
| `s` | 内存起始地址 |
| `c` | 要搜索的字节值 |
| `n` | 搜索字节数 |
| 返回值 | 指向找到位置的指针，未找到返回 `NULL`（`memchr`）或 `s + n`（`memscan`） |

```c
void *p = memchr(buf, '\n', len);
void *q = memscan(buf, '\n', len);
```

---

## bitmap 操作

### bitmap_zero / bitmap_fill / bitmap_set / bitmap_clear

```c
void bitmap_zero(unsigned long *dst, unsigned int nbits);
void bitmap_fill(unsigned long *dst, unsigned int nbits);
void bitmap_set(unsigned long *map, unsigned int start, unsigned int len);
void bitmap_clear(unsigned long *map, unsigned int start, unsigned int len);
```

| 参数 | 说明 |
|------|------|
| `dst`, `map` | bitmap 指针 |
| `nbits` | 位数 |
| `start` | 起始位 |
| `len` | 位长度 |

```c
DECLARE_BITMAP(bitmap, 64);
bitmap_zero(bitmap, 64);       // 清零
bitmap_fill(bitmap, 64);       // 全部置 1
bitmap_set(bitmap, 0, 8);      // 设置第 0-7 位
bitmap_clear(bitmap, 0, 4);    // 清除第 0-3 位
```

### bitmap_weight / bitmap_empty / bitmap_full

```c
unsigned int bitmap_weight(const unsigned long *src, unsigned int nbits);
bool bitmap_empty(const unsigned long *src, unsigned int nbits);
bool bitmap_full(const unsigned long *src, unsigned int nbits);
```

| 参数 | 说明 |
|------|------|
| `src` | bitmap 指针 |
| `nbits` | 位数 |
| 返回值 | `bitmap_weight` 返回置位数；`bitmap_empty` 全 0 返回 true；`bitmap_full` 全 1 返回 true |

```c
unsigned int cnt = bitmap_weight(bitmap, 64);
if (bitmap_empty(bitmap, 64)) { /* 全空 */ }
```

### bitmap_parse / bitmap_scnprintf

解析字符串为 bitmap / 将 bitmap 格式化为字符串。

```c
int bitmap_parse(const char *bp, unsigned int buflen, unsigned long *maskp, unsigned int nbits);
int bitmap_scnprintf(char *buf, unsigned int size, const unsigned long *maskp, unsigned int nbits);
```

```c
unsigned long mask;
bitmap_parse("0-3,8", 5, &mask, 32);  // mask = 0x10F
char buf[32];
bitmap_scnprintf(buf, sizeof(buf), &mask, 32);  // buf = "0-3,8"
```

### for_each_set_bit / for_each_clear_bit

遍历置位/清零位。

```c
for_each_set_bit(bit, bitmap, nbits)
for_each_clear_bit(bit, bitmap, nbits)
```

```c
unsigned int bit;
for_each_set_bit(bit, bitmap, 64) {
    // bit 为每个置位的索引
}
```

---

## 大小端转换

### cpu_to_le32 / le32_to_cpu / cpu_to_be32 / be32_to_cpu

```c
__le32 cpu_to_le32(u32 x);
u32 le32_to_cpu(__le32 x);
__be32 cpu_to_be32(u32 x);
u32 be32_to_cpu(__be32 x);
```

### cpu_to_le16 / le16_to_cpu / cpu_to_be16 / be16_to_cpu

```c
__le16 cpu_to_le16(u16 x);
u16 le16_to_cpu(__le16 x);
__be16 cpu_to_be16(u16 x);
u16 be16_to_cpu(__be16 x);
```

### cpu_to_le64 / le64_to_cpu / cpu_to_be64 / be64_to_cpu

```c
__le64 cpu_to_le64(u64 x);
u64 le64_to_cpu(__le64 x);
__be64 cpu_to_be64(u64 x);
u64 be64_to_cpu(__be64 x);
```

```c
__le32 le_val = cpu_to_le32(0x12345678);
u32 native_val = le32_to_cpu(le_val);
```

---

## 十六进制转储

### print_hex_dump

打印十六进制转储到内核日志。

```c
void print_hex_dump(const char *level, const char *prefix_str, int prefix_type,
                    int rowsize, int groupsize, const void *buf, size_t len, bool ascii);
```

| 参数 | 说明 |
|------|------|
| `level` | 日志级别（如 `KERN_INFO`） |
| `prefix_str` | 每行前缀字符串 |
| `prefix_type` | 前缀类型（`DUMP_PREFIX_ADDRESS`、`DUMP_PREFIX_OFFSET`、`DUMP_PREFIX_NONE`） |
| `rowsize` | 每行字节数 |
| `groupsize` | 每组字节数（通常 1、2、4、8） |
| `buf` | 数据缓冲区 |
| `len` | 数据长度 |
| `ascii` | 是否显示 ASCII |

```c
print_hex_dump(KERN_INFO, "data: ", DUMP_PREFIX_ADDRESS, 16, 1, buf, len, true);
```

### hex_dump_to_buffer

将十六进制转储输出到缓冲区。

```c
int hex_dump_to_buffer(const void *buf, size_t len, int rowsize, int groupsize,
                       char *linebuf, size_t linebuflen, bool ascii);
```

```c
char line[128];
hex_dump_to_buffer(buf, len, 16, 1, line, sizeof(line), true);
printk(KERN_INFO "%s\n", line);
```

---

## 位操作

### __builtin_ffs / __fls / __ffs / __ffz

```c
int __builtin_ffs(int x);  // 返回最低置位位（从 1 开始），无置位返回 0
int __fls(int x);          // 返回最高置位位（从 1 开始），无置位返回 0
int __ffs(int x);          // 同 __builtin_ffs，但实现相关
int __ffz(int x);          // 返回最低清零位（从 1 开始），全 1 返回 32
```

### fls / fls64 / ffs / ffz

```c
int fls(int x);
int fls64(u64 x);
int ffs(int x);
int ffz(unsigned long x);
```

| 参数 | 说明 |
|------|------|
| `x` | 输入值 |
| 返回值 | 位索引（从 1 开始），0 表示未找到 |

```c
int bit = ffs(0x10);   // bit = 5（最低置位位）
int high = fls(0x10);  // high = 5
int zero = ffz(0x1);   // zero = 2（最低清零位）
```

---

## 比较/交换

### unlikely / likely / __builtin_expect

提示编译器分支预测概率。

```c
unlikely(x)
likely(x)
__builtin_expect(x, val)
```

```c
if (unlikely(err)) {
    // 错误处理（不太可能发生）
}
if (likely(success)) {
    // 正常路径
}
```

### min / max / min_t / max_t

取最小值/最大值。

```c
min(x, y)
max(x, y)
min_t(type, x, y)
max_t(type, x, y)
```

`min_t` / `max_t` 避免类型提升问题。

```c
int a = 5, b = 10;
int small = min(a, b);      // small = 5
unsigned int u = min_t(unsigned int, a, b);  // 安全比较有符号/无符号
```