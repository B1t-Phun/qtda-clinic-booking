# RISK REGISTER v1 -- CLINICCARE

## Sổ đăng ký rủi ro phiên bản 1 (cuối Sprint 1)

**Dự án:** ClinicCare -- Hệ thống quản lý phòng khám đa khoa quy mô nhỏ\
**Phiên bản:** v1 -- Cuối Sprint 1\
**Công nghệ nền tảng:** Next.js và Supabase\
**Nhóm người dùng:** Admin, bác sĩ, lễ tân, bệnh nhân\
**Project Manager / Tech Lead:** Đỗ Lê Viết Tài

## 1. Mục đích

Tài liệu ghi nhận, phân tích, đánh giá và theo dõi các rủi ro có thể ảnh
hưởng đến phạm vi, tiến độ, chất lượng, bảo mật và khả năng vận hành của
ClinicCare tại thời điểm kết thúc Sprint 1.

## 2. Phương pháp đánh giá

-   Xác suất (P): từ 1 (rất thấp) đến 5 (rất cao).
-   Tác động (I): từ 1 (không đáng kể) đến 5 (rất nghiêm trọng).
-   **Điểm rủi ro = P × I.**

      Điểm Mức độ
  -------- ------------
      1--4 Thấp
      5--9 Trung bình
    10--16 Cao
    17--25 Rất cao

## 3. Danh sách rủi ro

  -------------------------------------------------------------------------------------------------------------------------
  Risk ID  Mô tả rủi  Nguyên nhân        P      I      Điểm   Mức độ  Chiến    Kế hoạch ứng phó     Chủ sở hữu Trạng thái
           ro                                                         lược ứng                                 
                                                                      phó                                      
  -------- ---------- ------------------ ------ ------ ------ ------- -------- -------------------- ---------- ------------
  CC-R01   Rò rỉ dữ   Cấu hình quyền     2      5      10     Cao     Tránh /  Thiết kế quyền truy  Đỗ Lê Viết Open
           liệu cá    truy cập chưa                                   Giảm     cập theo vai trò;    Tài --     
           nhân và hồ chặt; lưu khóa bí                               thiểu    bật và kiểm thử      Tech Lead  
           sơ khám    mật trong source                                         Supabase Row Level              
           bệnh       code; phân quyền                                         Security (RLS); dùng            
                      dữ liệu chưa được                                        biến môi trường;                
                      kiểm tra                                                 không đưa secret lên            
                                                                               Git; thu hồi và thay            
                                                                               khóa nếu phát hiện              
                                                                               lộ                              

  CC-R02   Phân quyền Chưa đặc tả ma     3      5      15     Cao     Giảm     Lập ma trận          Đỗ Lê Viết Monitoring
           sai giữa   trận quyền; kiểm                                thiểu    Role--Permission;    Tài --     
           Admin, bác tra quyền chỉ ở                                          kiểm thử truy cập    Tech Lead  
           sĩ, lễ tân giao diện mà thiếu                                       trái phép cho từng              
           và bệnh    kiểm tra ở                                               vai trò; kiểm tra               
           nhân       backend/database                                         quyền ở server và               
                                                                               RLS; review trước               
                                                                               khi triển khai                  

  CC-R03   Trùng lịch Không kiểm tra     3      4      12     Cao     Giảm     Xác định quy tắc đặt Backend    Open
           hoặc đặt   lịch làm việc bác                               thiểu    lịch; kiểm tra khung Lead /     
           lịch khám  sĩ, thời lượng                                           giờ khả dụng ở       thành viên 
           không hợp  khám, trạng thái                                         server/database; xử  phụ trách  
           lệ         lịch hẹn hoặc thao                                       lý đặt đồng thời;    lịch hẹn   
                      tác đặt đồng thời                                        kiểm thử tình huống             
                                                                               trùng lịch và                   
                                                                               hủy/đổi lịch                    

  CC-R04   Thiết kế   Thiếu phân tích    3      5      15     Cao     Giảm     Review ERD và        Database   Monitoring
           cơ sở dữ   quan hệ giữa bệnh                               thiểu    schema; xác định     Lead /     
           liệu không nhân, bác sĩ, lịch                                       khóa, ràng buộc,     thành viên 
           đáp ứng    hẹn, hồ sơ khám,                                         quan hệ và lịch sử   phụ trách  
           nghiệp vụ  đơn thuốc và dịch                                        dữ liệu; tạo         database   
           phòng khám vụ; thay đổi yêu                                         migration có kiểm               
                      cầu                                                      soát; rà soát với               
                                                                               luồng nghiệp vụ                 
                                                                               trước khi chốt                  

  CC-R05   Tích hợp   Cấu hình môi       3      4      12     Cao     Giảm     Chuẩn hóa cấu hình   Đỗ Lê Viết Monitoring
           Next.js và trường không đồng                               thiểu    môi trường; tạo      Tài --     
           Supabase   nhất; sử dụng                                            hướng dẫn setup;     Tech Lead  
           phát sinh  SDK/API chưa đúng;                                       kiểm thử kết nối,               
           lỗi        lỗi xác thực hoặc                                        đăng nhập và truy               
                      kết nối                                                  vấn mẫu; quản lý lỗi            
                                                                               và log phù hợp                  

  CC-R06   Phạm vi dự Phát sinh thêm     4      4      16     Cao     Giảm     Chốt MVP; ưu tiên    Đỗ Lê Viết Monitoring
           án tăng,   chức năng; chưa                                 thiểu    Must/Should/Could;   Tài --     
           không hoàn phân biệt MVP và                                         mọi thay đổi phải    Project    
           thành đúng chức năng mở rộng;                                       đánh giá tác động    Manager    
           Sprint     ước lượng chưa sát                                       tới thời gian và                
                      năng lực nhóm                                            nguồn lực; theo dõi             
                                                                               backlog và burndown             

  CC-R07   Chậm tiến  Task chưa có người 3      4      12     Cao     Giảm     Gán owner và         Đỗ Lê Viết Monitoring
           độ do phụ  chịu trách nhiệm;                               thiểu    deadline cho từng    Tài --     
           thuộc và   thành viên có lịch                                       Issue; chia nhỏ      Project    
           phân công  học khác nhau;                                           task; cập nhật tiến  Manager    
           chưa rõ    công việc phụ                                            độ thường xuyên; báo            
                      thuộc lẫn nhau                                           sớm blocker; điều               
                                                                               chỉnh nguồn lực khi             
                                                                               cần                             

  CC-R08   Xung đột   Nhiều thành viên   3      3      9      Trung   Giảm     Dùng branch riêng    Đỗ Lê Viết Monitoring
           mã nguồn   sửa cùng file;                          bình    thiểu    theo task; tạo Pull  Tài --     
           hoặc tích  chưa thống nhất                                          Request; yêu cầu     Tech Lead  
           hợp nhầm   branch strategy;                                         review; đồng bộ main            
           thay đổi   merge thiếu review                                       thường xuyên; chạy              
           khi merge  hoặc kiểm thử                                            kiểm thử trước                  
                                                                               merge; không commit             
                                                                               secret                          

  CC-R09   Thiếu kiểm Chưa có test case; 3      4      12     Cao     Giảm     Lập test checklist;  QA / thành Open
           thử khiến  ưu tiên phát triển                              thiểu    kiểm thử đăng nhập,  viên phụ   
           lỗi nghiệp chức năng; chưa                                          phân quyền, đặt/hủy  trách kiểm 
           vụ lọt     kiểm thử theo vai                                        lịch và hồ sơ;       thử        
           sang bản   trò và luồng                                             review code;                    
           bàn giao   đầu-cuối                                                 regression test                 
                                                                               trước nghiệm thu                

  CC-R10   Dữ liệu bị Chưa xác định      2      5      10     Cao     Giảm     Xác định lịch và     Database   Open
           mất hoặc   chính sách backup;                              thiểu /  phạm vi backup phù   Lead /     
           không thể  thao tác migration                              Chuyển   hợp; giới hạn quyền  Tech Lead  
           khôi phục  hoặc cập nhật dữ                                giao     thao tác dữ liệu;               
           khi có sự  liệu thiếu kiểm                                          kiểm tra migration              
           cố         soát; chưa thử                                           trên môi trường thử             
                      khôi phục                                                nghiệm; thử quy                 
                                                                               trình khôi phục                 

  CC-R11   Giao diện  Thiếu phản hồi từ  3      3      9      Trung   Giảm     Review prototype với UI/UX Lead Monitoring
           khó sử     Admin, bác sĩ, lễ                       bình    thiểu    đại diện người dùng; / BA       
           dụng hoặc  tân và bệnh nhân;                                        kiểm thử usability              
           không đáp  thiết kế chưa được                                       theo từng vai trò;              
           ứng nhu    kiểm thử với người                                       thống nhất luồng                
           cầu từng   dùng                                                     thao tác trước khi              
           vai trò                                                             hoàn thiện UI                   

  CC-R12   Nhóm thiếu Trao đổi phân tán; 3      3      9      Trung   Giảm     Dùng GitHub Issues   Đỗ Lê Viết Monitoring
           thống nhất Issue thiếu mô                          bình    thiểu    làm nguồn công việc; Tài --     
           yêu cầu và tả/tiêu chí hoàn                                         ghi acceptance       Project    
           phản hồi   thành; chưa có                                           criteria; quy định   Manager    
           review     thời hạn phản hồi                                        thời hạn review; họp            
           chậm       PR                                                       ngắn định kỳ và lưu             
                                                                               quyết định                      
  -------------------------------------------------------------------------------------------------------------------------

## 4. Ưu tiên xử lý

Các rủi ro có điểm cao nhất trong bản đánh giá ban đầu: - **CC-R06 --
Phạm vi dự án tăng (16 điểm):** kiểm soát MVP và mọi yêu cầu thay đổi. -
**CC-R02 -- Phân quyền sai (15 điểm):** xây dựng ma trận quyền và kiểm
thử quyền ở server/database. - **CC-R04 -- Thiết kế database chưa phù
hợp (15 điểm):** review ERD, schema và ràng buộc nghiệp vụ.

## 5. Quy ước trạng thái

-   **Open:** đã nhận diện, chưa triển khai biện pháp hoặc cần xác minh
    thêm.
-   **Monitoring:** đang theo dõi và triển khai biện pháp ứng phó.
-   **Mitigated:** đã giảm mức độ rủi ro; tiếp tục theo dõi nếu rủi ro
    vẫn còn.
-   **Closed:** không còn cần theo dõi; cần có căn cứ xác nhận.

## 6. Lưu ý và cập nhật

1.  Điểm P, I và trạng thái trong tài liệu là **đánh giá đề xuất ban
    đầu**, không phải số liệu đo lường hay bằng chứng rằng sự cố đã xảy
    ra.
2.  Các vai trò như BA, Database Lead, Backend Lead, QA và UI/UX Lead
    cần được thay bằng tên thành viên thực tế sau khi nhóm phân công.
3.  Nhóm cần review và xác nhận bảng trong Sprint Review/Retrospective
    trước khi chốt bản chính thức.
4.  Cập nhật Risk Register ở mỗi Sprint hoặc khi có thay đổi đáng kể về
    yêu cầu, công nghệ, nhân sự, tiến độ hoặc bảo mật.

**Vị trí lưu trữ đề xuất trên Google Drive:**
`ClinicCare/03_Risk_Register/ClinicCare_Risk_Register_v1_End_Sprint_1.md`
