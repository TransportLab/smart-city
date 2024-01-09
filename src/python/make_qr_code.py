import qrcode
import qrcode.image.svg


qr = qrcode.QRCode(
    version=8, # 1-40, higher is bigger
    error_correction=qrcode.constants.ERROR_CORRECT_H, # L, M, Q, H - higher is more robust
    box_size=10,
    border=4,
    image_factory=qrcode.image.svg.SvgPathImage
)
qr.add_data('https://github.com/transportlab/smart-city/')
qr.make(fit=True)
# qr.make(fit=False)

img = qr.make_image(fill_color="black", back_color="white")
img.save("qr.svg")