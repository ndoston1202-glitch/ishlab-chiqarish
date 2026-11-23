'use strict';
/* Namuna ma'lumotlar: kichik shirinlik (pechenye) sexi */
function buildDemo() {
  db = emptyDB();
  db.settings.name = 'Shirinlik sexi (namuna)';
  const t = todayStr();
  const day = n => addDays(t, -n);
  const add = (list, obj) => { const x = { id: uid(), ...obj }; db[list].push(x); return x; };

  const un = add('materials', { name: 'Un (oliy nav)', unit: 'kg', qty: 0, minQty: 100, price: 0 });
  const shakar = add('materials', { name: 'Shakar', unit: 'kg', qty: 0, minQty: 50, price: 0 });
  const yog = add('materials', { name: "Margarin", unit: 'kg', qty: 0, minQty: 30, price: 0 });
  const tuxum = add('materials', { name: 'Tuxum', unit: 'dona', qty: 0, minQty: 300, price: 0 });
  const kakao = add('materials', { name: 'Kakao kukuni', unit: 'kg', qty: 0, minQty: 5, price: 0 });
  const qadoq = add('materials', { name: 'Qadoq (paket)', unit: 'dona', qty: 0, minQty: 200, price: 0 });

  const s1 = add('suppliers', { name: '"Don Mahsulotlari" MChJ', phone: '+998 90 123 45 67', note: 'Un, shakar' });
  const s2 = add('suppliers', { name: 'Ulgurji bozor — Akmal aka', phone: '+998 93 765 43 21', note: 'Tuxum, margarin' });
  const s3 = add('suppliers', { name: '"Paket Plast" MChJ', phone: '+998 71 200 00 00', note: 'Qadoqlash' });

  const c1 = add('customers', { name: '"Korzinka" do\'koni', phone: '+998 78 140 00 00', note: 'Ulgurji' });
  const c2 = add('customers', { name: 'Ahmedov Bobur (savdo nuqtasi)', phone: '+998 97 111 22 33', note: 'Chorsu bozori' });
  const c3 = add('customers', { name: '"Baraka" minimarket', phone: '+998 99 444 55 66', note: '' });

  const w1 = add('workers', { name: 'Karimov Jasur', position: 'Usta (texnolog)', phone: '+998 90 000 11 22', payType: 'monthly', rate: 5000000 });
  const w2 = add('workers', { name: 'Rahimova Dilnoza', position: 'Qandolatchi', phone: '+998 91 000 33 44', payType: 'piece', rate: 1500 });
  const w3 = add('workers', { name: "Toshmatov Sardor", position: 'Qadoqlovchi', phone: '+998 93 000 55 66', payType: 'piece', rate: 800 });

  const p1 = add('products', { name: 'Pechenye "Sutli" 1 kg', unit: 'dona', qty: 0, price: 32000,
    recipe: [{ materialId: un.id, qty: 0.55 }, { materialId: shakar.id, qty: 0.25 }, { materialId: yog.id, qty: 0.18 }, { materialId: tuxum.id, qty: 4 }, { materialId: qadoq.id, qty: 1 }] });
  const p2 = add('products', { name: 'Pechenye "Shokoladli" 1 kg', unit: 'dona', qty: 0, price: 38000,
    recipe: [{ materialId: un.id, qty: 0.5 }, { materialId: shakar.id, qty: 0.25 }, { materialId: yog.id, qty: 0.18 }, { materialId: kakao.id, qty: 0.06 }, { materialId: tuxum.id, qty: 4 }, { materialId: qadoq.id, qty: 1 }] });
  const p3 = add('products', { name: 'Vafli 500 g', unit: 'dona', qty: 0, price: 18000,
    recipe: [{ materialId: un.id, qty: 0.25 }, { materialId: shakar.id, qty: 0.15 }, { materialId: yog.id, qty: 0.07 }, { materialId: tuxum.id, qty: 1 }, { materialId: qadoq.id, qty: 1 }] });

  const ok = err => { if (err) console.warn('Demo:', err); };
  // Xomashyo kirimlari
  const buy = (d, m, sup, qty, price, paid = qty * price) => ok(opPurchase({ date: day(d), materialId: m.id, supplierId: sup.id, qty, price, paid }));
  buy(24, un, s1, 1300, 6500);
  buy(24, shakar, s1, 900, 12000);
  buy(23, yog, s2, 560, 28000);
  buy(23, tuxum, s2, 8000, 1300);
  buy(22, kakao, s1, 60, 85000);
  buy(22, qadoq, s3, 4000, 600);
  buy(10, un, s1, 400, 6700, 1000000);
  buy(9, tuxum, s2, 1800, 1350, 1430000);

  // Ishlab chiqarish va sotuvlar (oxirgi 20 kun)
  const plan = [[p1, 70, w2], [p2, 45, w2], [p3, 60, w3]];
  for (let d = 20; d >= 0; d--) {
    if (new Date(day(d)).getDay() === 0) continue; // yakshanba — dam olish
    plan.forEach(([p, base, w], i) => {
      const q = base + ((d * 7 + i * 13) % 15) - 7;
      const defect = (d + i) % 4 === 0 ? 2 + (d % 3) : 0;
      ok(opProduce({ date: day(d), productId: p.id, qty: q, defect, workerId: w.id }));
    });
    if (d > 18) continue;
    if (d % 2 === 0) ok(opSale({ date: day(d), customerId: c1.id, productId: p1.id, qty: 80, price: 31000, paid: d < 4 ? 0 : 2480000 }));
    if (d % 3 === 0) ok(opSale({ date: day(d), customerId: c2.id, productId: p2.id, qty: 60, price: 37000, paid: d % 6 === 0 ? 1500000 : 2220000 }));
    if (d % 2 === 1) ok(opSale({ date: day(d), customerId: c3.id, productId: p3.id, qty: 90, price: 18000, paid: 1620000 }));
    if (d % 4 === 1) ok(opSale({ date: day(d), customerId: '', productId: p1.id, qty: 15, price: 32000, paid: 480000 }));
  }

  ok(opPayment('customer', { date: day(2), partyId: c2.id, amount: 1500000, note: 'Naqd' }));
  ok(opPayment('supplier', { date: day(5), partyId: s1.id, amount: 1000000, note: "Bank o'tkazmasi" }));

  ok(opWriteoff({ date: day(6), type: 'material', itemId: tuxum.id, qty: 60, reason: 'Shikastlangan', note: 'Tashishda singan' }));
  ok(opWriteoff({ date: day(3), type: 'product', itemId: p3.id, qty: 8, reason: 'Yaroqsiz (brak)', note: 'Qadoq yirtilgan' }));

  const ms = monthStart();
  const expDate = n => (day(n) >= ms ? day(n) : t);
  ok(opExpense({ date: expDate(15), category: 'Elektr energiya', amount: 2400000, note: 'Pech va sovutgich' }));
  ok(opExpense({ date: expDate(15), category: 'Gaz', amount: 1800000 }));
  ok(opExpense({ date: expDate(14), category: 'Ijara', amount: 6000000, note: 'Sex binosi' }));
  ok(opExpense({ date: expDate(7), category: 'Transport', amount: 950000, note: 'Yetkazib berish' }));
  ok(opExpense({ date: expDate(1), category: 'Ish haqi', amount: 2500000, workerId: w1.id, note: 'Avans' }));

  return db;
}
