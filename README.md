# MỘC — Tủ rượu 129

Thiết kế tủ rượu tương tác bằng Three.js, dựng từ phác thảo của người dùng.

## Chạy thiết kế

```sh
npm install
npm run dev
```

Mở địa chỉ được Vite in ra (mặc định http://localhost:5173).

```sh
npm run build
npm run preview
```

## Bố trí

- Thân rộng 129 cm, cao tổng thể 197 cm (đọc từ ghi kích thước trên ảnh).
- Thêm tán gỗ ở nóc và mặt giữa theo yêu cầu: mỗi tán rộng 137 cm, dày 32 mm, nhô 4 cm mỗi bên và 5 cm phía trước, có diềm hai tầng bo cạnh nhẹ. Chiều cao tổng thể vẫn 197 cm.
- Sâu thân 24 cm theo yêu cầu bổ sung, có thể chọn 24 / 35 / 40 / 45 cm; sâu cả tán tương ứng 29 / 40 / 45 / 50 cm. Tổng thể mặc định: 137 × 197 × 29 cm (rộng × cao × sâu).
- Hai cánh tủ dưới nằm ở hai bên; hai ngăn kéo xếp dọc ở giữa, ngăn trên nông và ngăn dưới sâu.
- Kệ trên mở, chia ô bất đối xứng theo ảnh. Thêm giá chai nằm ngang theo chiều rộng tủ để vừa thân sâu 24 cm, ly treo, gốm, sách và đèn LED 2700 K.
- Gợi ý vật liệu: ván phủ veneer gỗ, thân dày 18 mm, tay nắm đồng xước, chân cao 8 cm. Đây là mô hình ý tưởng, cần xác nhận đo đạc và phụ kiện trước khi lập bản vẽ sản xuất.

## Tương tác

Touchpad: vuốt hai ngón ngang/dọc để xoay; chụm hai ngón để thu phóng. Có nút “Cuộn để: Xoay tủ / Thu phóng” để dùng được cả touchpad và con lăn chuột. Kéo trực tiếp cũng xoay được. Khi khung 3D có tiêu điểm, dùng các phím mũi tên để xoay, +/- để thu phóng và 0 để đặt lại góc nhìn.

Có các góc phối cảnh, chính diện và chi tiết; nút hiện kích thước; mở cánh / ngăn kéo; đổi màu gỗ; tắt trang trí / đèn; lưu PNG và xuất GLB. Đơn vị trong mô hình: mét. GLB bao gồm thiết kế hiện tại; PNG chụp góc nhìn đang chọn.

## Điện thoại và máy tính bảng

Màn hình rộng tối đa 900 px và điện thoại xoay ngang dùng khung 3D toàn vùng xem, bảng tùy chỉnh đóng/mở từ dưới lên, nút chạm tối thiểu 44 px và hỗ trợ vùng an toàn của màn hình. Kéo một ngón để xoay, chụm hai ngón để thu phóng. Bảng tùy chỉnh cuộn riêng, có thể đóng bằng nút tiêu đề, chạm vùng nền hoặc phím Escape. Góc xoay và mức thu phóng tương đối được giữ lại khi đổi hướng màn hình. Mật độ pixel dựng hình được giới hạn 1,5 trên bố cục nhỏ để giảm tải GPU.

Ảnh gốc lưu tại `public/reference.jpg`. Không cần dịch vụ AI hoặc khóa API. Mã Three.js được cài cục bộ. Font Be Vietnam Pro tải từ Google Fonts; khi ngoại tuyến giao diện dùng font hệ thống.
