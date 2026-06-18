# Viết Query EF Core sao cho ổn

## 1. Mục tiêu

EF Core giúp viết query nhanh và dễ đọc, nhưng nếu dùng không cẩn thận thì rất dễ tạo ra các vấn đề:

* Query chậm.
* Load dư dữ liệu.
* Sinh quá nhiều SQL query.
* Dính lỗi N+1.
* Dùng sai `Include`.
* Filter không ăn index.
* Tracking không cần thiết.
* Query bị evaluate sai phía client.
* Pagination càng về sau càng chậm.

Mục tiêu khi viết query EF Core không phải là viết LINQ cho ngắn nhất, mà là viết query:

* Dễ đọc.
* Dễ maintain.
* Sinh SQL hợp lý.
* Không load dư dữ liệu.
* Không tạo side effect ngoài ý muốn.
* Có thể scale khi dữ liệu lớn lên.

---

## 2. Nguyên tắc cơ bản

### 2.1. Query phải bắt đầu từ nhu cầu dữ liệu

Trước khi viết query, nên xác định rõ:

* Màn hình/API cần field nào?
* Có cần update entity sau khi query không?
* Có cần relation không?
* Dữ liệu có phân trang không?
* Có thể trả về bao nhiêu dòng?
* Query có chạy thường xuyên không?
* Các field filter/sort đã có index chưa?

Sai lầm phổ biến là query entity đầy đủ trước, rồi mới xử lý ở memory.

Không nên:

```csharp
var customers = await context.Customers
    .Where(x => x.Status != "D")
    .ToListAsync();

var result = customers.Select(x => new CustomerDto
{
    Id = x.Id,
    FullName = x.FullName
}).ToList();
```

Nên:

```csharp
var result = await context.Customers
    .Where(x => x.Status != "D")
    .Select(x => new CustomerDto
    {
        Id = x.Id,
        FullName = x.FullName
    })
    .ToListAsync();
```

Lý do:

* Cách đầu load toàn bộ entity.
* Cách sau chỉ select đúng cột cần dùng.
* Database xử lý filter.
* App giảm memory.
* SQL sinh ra rõ ràng hơn.

---

## 3. Dùng `AsNoTracking()` cho query chỉ đọc

Nếu query chỉ để hiển thị dữ liệu, trả API, export, report, search list thì nên dùng:

```csharp
.AsNoTracking()
```

Ví dụ:

```csharp
var missions = await context.IdpLopMissionDefinitions
    .AsNoTracking()
    .Where(x => x.Status != "D")
    .Select(x => new MissionDto
    {
        MissionCode = x.MissionCode,
        MissionName = x.MissionName,
        RewardType = x.RewardType
    })
    .ToListAsync();
```

Không nên tracking nếu không update entity.

### Khi nào không dùng `AsNoTracking()`?

Khi cần update entity đã query:

```csharp
var mission = await context.IdpLopMissionDefinitions
    .FirstOrDefaultAsync(x => x.MissionCode == missionCode);

mission.MissionName = request.MissionName;

await context.SaveChangesAsync();
```

Trong case này tracking là hợp lý.

---

## 4. Luôn `Select` đúng dữ liệu cần dùng

EF Core rất dễ làm mình quên rằng query entity là đang load toàn bộ column của bảng.

Không nên:

```csharp
var customers = await context.Customers
    .AsNoTracking()
    .Where(x => x.BusinessCode == businessCode)
    .ToListAsync();

return customers.Select(x => new CustomerListItem
{
    CustomerId = x.CustomerId,
    FullName = x.FullName
});
```

Nên:

```csharp
var customers = await context.Customers
    .AsNoTracking()
    .Where(x => x.BusinessCode == businessCode)
    .Select(x => new CustomerListItem
    {
        CustomerId = x.CustomerId,
        FullName = x.FullName
    })
    .ToListAsync();
```

Nguyên tắc:

> API trả field nào thì query field đó.

---

## 5. Không `ToList()` quá sớm

Một lỗi rất hay gặp:

```csharp
var query = await context.Customers
    .Where(x => x.Status != "D")
    .ToListAsync();

if (!string.IsNullOrEmpty(searchKey))
{
    query = query
        .Where(x => x.FullName.Contains(searchKey))
        .ToList();
}
```

Vấn đề:

* `ToListAsync()` đã execute query.
* Các filter sau đó chạy ở memory.
* Nếu bảng lớn thì rất nguy hiểm.

Nên giữ query ở dạng `IQueryable` đến cuối:

```csharp
var query = context.Customers
    .AsNoTracking()
    .Where(x => x.Status != "D");

if (!string.IsNullOrWhiteSpace(searchKey))
{
    query = query.Where(x => x.FullName.Contains(searchKey));
}

var result = await query
    .Select(x => new CustomerDto
    {
        CustomerId = x.CustomerId,
        FullName = x.FullName
    })
    .ToListAsync();
```

Nguyên tắc:

> Chỉ gọi `ToListAsync`, `FirstOrDefaultAsync`, `CountAsync`, `AnyAsync` ở bước cuối cùng.

---

## 6. Phân biệt `IQueryable` và `IEnumerable`

`IQueryable` còn có thể được EF Core dịch sang SQL.

`IEnumerable` thường đã chuyển sang xử lý phía C# memory.

Không nên chuyển sang `AsEnumerable()` nếu chưa thật sự cần.

Không nên:

```csharp
var result = await context.Customers
    .AsEnumerable()
    .Where(x => NormalizeName(x.FullName).Contains(searchKey))
    .ToListAsync();
```

Vấn đề:

* `AsEnumerable()` kéo dữ liệu về memory.
* Sau đó filter bằng C#.
* Dữ liệu lớn sẽ rất chậm.

Nếu cần logic phức tạp không translate được sang SQL, nên cân nhắc:

* Đưa logic về SQL.
* Tạo computed column.
* Tạo normalized column.
* Filter sơ bộ ở DB trước, xử lý chi tiết sau.
* Không kéo toàn bảng về memory.

---

## 7. Cẩn thận với `Include`

`Include` dùng để load navigation property, nhưng không phải lúc nào cũng cần.

Không nên dùng `Include` chỉ để lấy vài field.

Không nên:

```csharp
var orders = await context.Orders
    .Include(x => x.Customer)
    .AsNoTracking()
    .Select(x => new OrderDto
    {
        OrderId = x.OrderId,
        CustomerName = x.Customer.FullName
    })
    .ToListAsync();
```

Thường chỉ cần project trực tiếp:

```csharp
var orders = await context.Orders
    .AsNoTracking()
    .Select(x => new OrderDto
    {
        OrderId = x.OrderId,
        CustomerName = x.Customer.FullName
    })
    .ToListAsync();
```

EF Core có thể tự sinh join cần thiết khi project navigation property.

### Khi nào dùng `Include`?

Khi cần load entity graph để xử lý object đầy đủ:

```csharp
var order = await context.Orders
    .Include(x => x.OrderItems)
    .FirstOrDefaultAsync(x => x.OrderId == orderId);
```

Nhưng với API list/detail thông thường, `Select DTO` thường tốt hơn.

---

## 8. Tránh lỗi N+1

N+1 xảy ra khi query cha trước, sau đó mỗi item lại query con.

Ví dụ xấu:

```csharp
var customers = await context.Customers
    .Where(x => x.Status != "D")
    .ToListAsync();

foreach (var customer in customers)
{
    var orders = await context.Orders
        .Where(x => x.CustomerId == customer.CustomerId)
        .ToListAsync();
}
```

Nếu có 100 customers:

* 1 query lấy customers
* 100 query lấy orders

Tổng cộng 101 queries.

Nên dùng join/group/projection:

```csharp
var result = await context.Customers
    .AsNoTracking()
    .Where(c => c.Status != "D")
    .Select(c => new CustomerOrderSummaryDto
    {
        CustomerId = c.CustomerId,
        FullName = c.FullName,
        OrderCount = context.Orders.Count(o => o.CustomerId == c.CustomerId)
    })
    .ToListAsync();
```

Hoặc query orders theo batch:

```csharp
var customerIds = await context.Customers
    .AsNoTracking()
    .Where(x => x.Status != "D")
    .Select(x => x.CustomerId)
    .ToListAsync();

var orderCounts = await context.Orders
    .AsNoTracking()
    .Where(x => customerIds.Contains(x.CustomerId))
    .GroupBy(x => x.CustomerId)
    .Select(g => new
    {
        CustomerId = g.Key,
        Count = g.Count()
    })
    .ToDictionaryAsync(x => x.CustomerId, x => x.Count);
```

---

## 9. Dùng `AnyAsync()` thay vì `CountAsync() > 0`

Không nên:

```csharp
var exists = await context.Customers
    .CountAsync(x => x.CustomerId == customerId) > 0;
```

Nên:

```csharp
var exists = await context.Customers
    .AnyAsync(x => x.CustomerId == customerId);
```

`AnyAsync()` đúng ý nghĩa hơn và database có thể dừng ngay khi tìm thấy bản ghi đầu tiên.

---

## 10. Dùng `FirstOrDefaultAsync()` đúng mục đích

Nếu cần lấy một bản ghi đầu tiên:

```csharp
var customer = await context.Customers
    .FirstOrDefaultAsync(x => x.CustomerId == customerId);
```

Nếu logic yêu cầu chắc chắn chỉ có một bản ghi, có thể dùng:

```csharp
var customer = await context.Customers
    .SingleOrDefaultAsync(x => x.CustomerId == customerId);
```

Nhưng cần hiểu:

* `FirstOrDefaultAsync()` lấy bản ghi đầu tiên.
* `SingleOrDefaultAsync()` kiểm tra có nhiều hơn một bản ghi không.
* `SingleOrDefaultAsync()` có thể tốn hơn nếu database cần xác nhận uniqueness.

Với khóa chính hoặc unique index, cả hai đều ổn. Với query bình thường, nên chọn đúng theo logic nghiệp vụ.

---

## 11. Luôn phân trang với API list

Không nên trả list không giới hạn:

```csharp
var result = await context.Customers
    .AsNoTracking()
    .Where(x => x.Status != "D")
    .ToListAsync();
```

Nên:

```csharp
var pageIndex = Math.Max(request.PageIndex, 1);
var pageSize = Math.Clamp(request.PageSize, 1, 100);

var query = context.Customers
    .AsNoTracking()
    .Where(x => x.Status != "D");

var total = await query.CountAsync();

var items = await query
    .OrderByDescending(x => x.DateCreated)
    .Skip((pageIndex - 1) * pageSize)
    .Take(pageSize)
    .Select(x => new CustomerDto
    {
        CustomerId = x.CustomerId,
        FullName = x.FullName,
        DateCreated = x.DateCreated
    })
    .ToListAsync();
```

Lưu ý:

* Phải có `OrderBy` trước `Skip/Take`.
* Giới hạn `pageSize`.
* Không cho client truyền `pageSize = 999999`.

---

## 12. Cẩn thận với `Contains`

`Contains` trên list nhỏ thường ổn:

```csharp
var businessCodes = new[] { "DTS", "IDP" };

var result = await context.Customers
    .Where(x => businessCodes.Contains(x.BusinessCode))
    .ToListAsync();
```

Nhưng nếu list quá lớn, SQL sinh ra có thể rất dài.

Với danh sách lớn, cân nhắc:

* Temporary table.
* Table-valued parameter.
* Bulk insert vào bảng tạm.
* Join với bảng thật.
* Chia batch.

Không nên truyền hàng chục nghìn ID vào `Contains`.

---

## 13. Filter cần thân thiện với index

Ví dụ:

```csharp
.Where(x => x.FullName.Contains(searchKey))
```

thường sẽ sinh:

```sql
LIKE '%searchKey%'
```

Dạng này khó dùng index hiệu quả.

Tốt hơn nếu nghiệp vụ cho phép:

```csharp
.Where(x => x.FullName.StartsWith(searchKey))
```

hoặc có thêm column normalized/search key:

```csharp
.Where(x => x.NormalizedFullName.StartsWith(normalizedSearchKey))
```

Một số nguyên tắc:

* `StartsWith` thường thân thiện với index hơn `Contains`.
* Tránh function trực tiếp trên column trong `Where`.
* Tránh `ToLower()` trên column nếu có thể.
* Nên lưu thêm normalized column nếu search thường xuyên.
* Field thường filter/sort nên có index.

Không tối ưu:

```csharp
.Where(x => x.FullName.ToLower().Contains(searchKey.ToLower()))
```

Tốt hơn:

```csharp
var normalizedSearchKey = searchKey.Trim().ToUpper();

query = query.Where(x => x.NormalizedFullName.Contains(normalizedSearchKey));
```

---

## 14. Cẩn thận với logic quá phức tạp trong `Select`

Một lỗi nguy hiểm là viết quá nhiều logic C# trong `Select`, khiến query không còn được dịch trọn vẹn sang SQL.

Ví dụ không tốt:

```csharp
var result = await context.Customers
    .AsNoTracking()
    .Select(x => new CustomerDto
    {
        CustomerId = x.CustomerId,
        FullName = FormatFullName(x.FullName),
        Age = CalculateAge(x.Birthday),
        LevelName = GetLevelName(x.TotalPoint),
        IsSpecial = CheckSpecialCustomer(x)
    })
    .ToListAsync();
```

Vấn đề:

* `FormatFullName`
* `CalculateAge`
* `GetLevelName`
* `CheckSpecialCustomer`

là các method C# custom.

EF Core không chắc có thể dịch các method này sang SQL. Nếu logic không translate được, query có thể fail hoặc bị buộc xử lý phía memory tùy version/case sử dụng.

Cách an toàn hơn là chia làm 2 bước.

Bước 1: query đúng dữ liệu cần thiết từ database.

```csharp
var rawCustomers = await context.Customers
    .AsNoTracking()
    .Where(x => x.Status != "D")
    .Select(x => new
    {
        x.CustomerId,
        x.FullName,
        x.Birthday,
        x.TotalPoint
    })
    .ToListAsync();
```

Bước 2: xử lý logic C# sau khi dữ liệu đã được giới hạn.

```csharp
var result = rawCustomers
    .Select(x => new CustomerDto
    {
        CustomerId = x.CustomerId,
        FullName = FormatFullName(x.FullName),
        Age = CalculateAge(x.Birthday),
        LevelName = GetLevelName(x.TotalPoint),
        IsSpecial = CheckSpecialCustomer(x.TotalPoint)
    })
    .ToList();
```

Điểm quan trọng là bước 1 phải có:

* `Where`
* `Select`
* `Skip`
* `Take`
* giới hạn dữ liệu rõ ràng

Không được kéo toàn bộ bảng về rồi mới xử lý logic.

Ví dụ nguy hiểm:

```csharp
var rawCustomers = await context.Customers
    .AsNoTracking()
    .ToListAsync();

var result = rawCustomers
    .Where(x => CheckSpecialCustomer(x))
    .Select(x => MapCustomer(x))
    .ToList();
```

Đây là lỗi nghiêm trọng vì toàn bộ bảng `Customers` đã được load vào memory.

Cách tốt hơn:

```csharp
var rawCustomers = await context.Customers
    .AsNoTracking()
    .Where(x => x.Status != "D")
    .Where(x => x.TotalPoint >= 1000)
    .OrderByDescending(x => x.DateCreated)
    .Take(100)
    .Select(x => new
    {
        x.CustomerId,
        x.FullName,
        x.Birthday,
        x.TotalPoint
    })
    .ToListAsync();

var result = rawCustomers
    .Select(x => new CustomerDto
    {
        CustomerId = x.CustomerId,
        FullName = FormatFullName(x.FullName),
        Age = CalculateAge(x.Birthday),
        LevelName = GetLevelName(x.TotalPoint)
    })
    .ToList();
```

Nguyên tắc:

> Logic nào database làm được thì để database làm. Logic nào chỉ C# làm được thì chỉ xử lý sau khi dữ liệu đã được filter, sort và giới hạn.

Checklist khi viết `Select`:

* Trong `Select` có gọi custom method không?
* Có gọi method không translate được sang SQL không?
* Có xử lý JSON, parse string, format date phức tạp không?
* Có gọi service/cache/API trong `Select` không?
* Có query khác bên trong `Select` không?
* Có đảm bảo dữ liệu đã được giới hạn trước khi xử lý memory không?

Một `Select` tốt thường chỉ nên gồm:

```csharp
.Select(x => new Dto
{
    Id = x.Id,
    Name = x.Name,
    Status = x.Status,
    DateCreated = x.DateCreated
})
```

Một `Select` phức tạp nên được tách thành:

```text
Database query -> Raw DTO -> C# mapping -> Final DTO
```

Cách này rõ ràng hơn, dễ debug hơn và tránh rủi ro load dữ liệu quá lớn vào memory.


---

## 15. Dùng `Join` khi cần, nhưng đừng lạm dụng

EF Core hỗ trợ navigation property, nhưng trong nhiều hệ thống legacy hoặc database không có FK rõ ràng, `Join` vẫn rất cần thiết.

Ví dụ:

```csharp
var result = await context.IdpLopCustInfos
    .AsNoTracking()
    .Where(lop => lop.BusinessCode == businessCode && lop.Status != "D")
    .Join(
        context.IdpCustInfos.AsNoTracking().Where(c => c.Status != "D"),
        lop => lop.CustId,
        cust => cust.CustId,
        (lop, cust) => new CustomerDto
        {
            CustomerId = lop.CustomerId,
            CustId = cust.CustId,
            FullName = cust.FullName,
            BusinessCode = lop.BusinessCode
        }
    )
    .ToListAsync();
```

Nguyên tắc:

* Filter càng sớm càng tốt.
* Join trên field có index.
* Projection ra DTO.
* Không join xong mới filter ở memory.

---

## 16. `GroupBy` nên project gọn

Ví dụ đếm số customer theo business:

```csharp
var result = await context.IdpLopCustInfos
    .AsNoTracking()
    .Where(x => businessCodes.Contains(x.BusinessCode))
    .GroupBy(x => x.BusinessCode)
    .Select(g => new
    {
        BusinessCode = g.Key,
        Count = g.Count()
    })
    .ToDictionaryAsync(x => x.BusinessCode, x => x.Count);
```

Không nên group xong load toàn bộ entity nếu chỉ cần count/sum/min/max.

---

## 17. Dùng transaction đúng lúc

Không phải query nào cũng cần transaction thủ công.

Cần transaction khi:

* Có nhiều thao tác ghi cần atomic.
* Insert nhiều bảng liên quan.
* Một bước fail thì rollback toàn bộ.
* Cần consistency rõ ràng.

Ví dụ:

```csharp
await using var transaction = await context.Database.BeginTransactionAsync();

try
{
    context.Orders.Add(order);
    context.OrderItems.AddRange(items);

    await context.SaveChangesAsync();
    await transaction.CommitAsync();
}
catch
{
    await transaction.RollbackAsync();
    throw;
}
```

Không cần transaction thủ công cho query read-only thông thường.

---

## 18. Đừng dùng `SaveChangesAsync()` trong vòng lặp

Không nên:

```csharp
foreach (var item in items)
{
    context.Customers.Add(item);
    await context.SaveChangesAsync();
}
```

Nên:

```csharp
context.Customers.AddRange(items);
await context.SaveChangesAsync();
```

Hoặc với update nhiều bản ghi, cân nhắc:

```csharp
await context.Customers
    .Where(x => x.Status == "P")
    .ExecuteUpdateAsync(setters => setters
        .SetProperty(x => x.Status, "A"));
```

`ExecuteUpdateAsync` và `ExecuteDeleteAsync` rất hữu ích khi không cần load entity lên memory.

---

## 19. Luôn xem SQL EF sinh ra

Khi nghi query chậm hoặc sai, hãy xem SQL.

```csharp
var query = context.Customers
    .Where(x => x.Status != "D")
    .Select(x => new
    {
        x.CustomerId,
        x.FullName
    });

var sql = query.ToQueryString();
```

Log SQL giúp phát hiện:

* Select dư column.
* Join dư bảng.
* N+1.
* Filter không như mong muốn.
* `Include` sinh query quá lớn.
* Query không dùng index.

---

## 20. Một template query list nên dùng

```csharp
public async Task<object> Execute(
    DigitalContext context,
    string businessCode,
    string searchKey,
    int pageIndex = 1,
    int pageSize = 20)
{
    pageIndex = Math.Max(pageIndex, 1);
    pageSize = Math.Clamp(pageSize, 1, 100);

    var query = context.Customers
        .AsNoTracking()
        .Where(x => x.Status != "D" && x.BusinessCode == businessCode);

    if (!string.IsNullOrWhiteSpace(searchKey))
    {
        searchKey = searchKey.Trim();

        query = query.Where(x =>
            x.FullName.Contains(searchKey) ||
            x.PhoneNumber.Contains(searchKey) ||
            x.Email.Contains(searchKey));
    }

    var total = await query.CountAsync();

    var items = await query
        .OrderByDescending(x => x.DateCreated)
        .Skip((pageIndex - 1) * pageSize)
        .Take(pageSize)
        .Select(x => new CustomerListItemDto
        {
            CustomerId = x.CustomerId,
            FullName = x.FullName,
            PhoneNumber = x.PhoneNumber,
            Email = x.Email,
            DateCreated = x.DateCreated
        })
        .ToListAsync();

    return new
    {
        Total = total,
        Items = items
    };
}
```

Checklist của template này:

* Có `AsNoTracking`.
* Có filter status.
* Có filter business.
* Có search optional.
* Có count.
* Có order.
* Có paging.
* Có projection DTO.
* Không `ToList` sớm.
* Không load dư entity.

---

## 21. Các lỗi thường gặp

### Lỗi 1: Query xong mới filter

```csharp
var data = await query.ToListAsync();
data = data.Where(x => x.Status == "A").ToList();
```

Cách tránh:

```csharp
var data = await query
    .Where(x => x.Status == "A")
    .ToListAsync();
```

---

### Lỗi 2: Load entity trong khi chỉ cần DTO

```csharp
var data = await context.Customers.ToListAsync();
```

Cách tránh:

```csharp
var data = await context.Customers
    .Select(x => new CustomerDto
    {
        CustomerId = x.CustomerId,
        FullName = x.FullName
    })
    .ToListAsync();
```

---

### Lỗi 3: Dùng `Include` quá nhiều

```csharp
context.Orders
    .Include(x => x.Customer)
    .Include(x => x.Items)
    .Include(x => x.Payments)
    .Include(x => x.Vouchers)
```

Cách tránh:

* Chỉ include cái thật sự cần.
* Ưu tiên `Select`.
* Cân nhắc `AsSplitQuery`.
* Tách API detail/list rõ ràng.

---

### Lỗi 4: Không giới hạn page size

```csharp
.Take(request.PageSize)
```

Cách tránh:

```csharp
var pageSize = Math.Clamp(request.PageSize, 1, 100);
```

---

### Lỗi 5: Dùng `Count` để check tồn tại

```csharp
await query.CountAsync() > 0
```

Cách tránh:

```csharp
await query.AnyAsync()
```

---

### Lỗi 6: `SaveChanges` trong loop

```csharp
foreach (var item in items)
{
    context.Add(item);
    await context.SaveChangesAsync();
}
```

Cách tránh:

```csharp
context.AddRange(items);
await context.SaveChangesAsync();
```

---

### Lỗi 7: Không có index cho field hay filter

Ví dụ hay filter:

```csharp
BusinessCode
Status
DateCreated
CustomerId
MissionCode
TransactionCode
```

Thì database nên có index phù hợp.

EF query tốt nhưng database không có index thì vẫn chậm.

---

## 22. Một số tip thực tế

### Tip 1: Query read-only mặc định nên dùng `AsNoTracking`

Nếu project có nhiều API list/detail chỉ đọc, có thể cân nhắc cấu hình default no tracking cho context read-only.

---

### Tip 2: Tách query list và detail

List không nên dùng chung query với detail.

List cần ít field:

```csharp
MissionCode
MissionName
RewardType
Status
DateCreated
```

Detail mới cần đầy đủ config.

---

### Tip 3: Filter trước, join sau

Nên filter từng bảng trước khi join:

```csharp
var result = await context.A
    .Where(a => a.Status != "D")
    .Join(
        context.B.Where(b => b.Status != "D"),
        a => a.Id,
        b => b.AId,
        (a, b) => new { a, b }
    )
    .ToListAsync();
```

---

### Tip 4: Đừng che giấu query quá sâu

Không nên tạo helper quá chung chung khiến không biết query thật sự làm gì.

Ví dụ xấu:

```csharp
var data = await customerRepository.GetValidCustomers(request);
```

Nếu helper này include nhiều bảng, filter động phức tạp, rất khó debug.

Query quan trọng nên rõ ràng ở service/use-case.

---

### Tip 5: Log SQL khi optimize

Khi query chậm, đừng đoán.

Hãy xem:

* SQL sinh ra.
* Execution plan.
* Index đang dùng.
* Số row đọc.
* Số row trả về.
* Query có bị scan toàn bảng không.

---

### Tip 6: Không tối ưu quá sớm

Không phải query nào cũng cần phức tạp.

Với bảng nhỏ, query rõ ràng quan trọng hơn query quá tối ưu nhưng khó đọc.

Nhưng với bảng lớn hoặc API gọi thường xuyên, cần nghiêm túc kiểm tra SQL và index.

---

## 23. Checklist nhanh trước khi merge query EF Core

Trước khi merge code có query EF Core, nên tự hỏi:

* Query này có `AsNoTracking()` nếu chỉ đọc chưa?
* Có `Select DTO` thay vì load entity không?
* Có bị `ToList()` quá sớm không?
* Có phân trang không?
* Có giới hạn `pageSize` không?
* Có `OrderBy` trước `Skip/Take` không?
* Có dùng `AnyAsync()` thay vì `CountAsync() > 0` không?
* Có nguy cơ N+1 không?
* Có `Include` dư không?
* Field filter/sort có index không?
* Query có chạy được hoàn toàn ở database không?
* Có cần xem `ToQueryString()` không?
* Có xử lý null an toàn không?
* Có cancellation token nếu query dài không?
* Có timeout hoặc batch nếu dữ liệu lớn không?

---

## 24. Kết luận

EF Core không chậm nếu dùng đúng.

Phần lớn vấn đề hiệu năng đến từ:

* load dư dữ liệu,
* query quá sớm,
* xử lý ở memory,
* thiếu index,
* include quá nhiều,
* lazy loading gây N+1,
* không phân trang,
* không xem SQL thật sự được sinh ra.

Nguyên tắc thực tế:

> Query càng rõ nhu cầu dữ liệu, càng ít bất ngờ.

Với API production, một query EF Core tốt nên:

* filter ở database,
* select đúng field,
* không tracking nếu chỉ đọc,
* phân trang rõ ràng,
* tránh N+1,
* tận dụng index,
* sinh SQL có thể kiểm soát được.

Viết LINQ đẹp là tốt, nhưng SQL sinh ra mới là thứ database thật sự chạy.
