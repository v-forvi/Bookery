import { db } from '../src/server/db';
import { books, loans } from '../src/server/schema';
import { eq, and } from 'drizzle-orm';

async function testLendingFeature() {
  console.log('🧪 Testing Lending Feature Backend...\n');

  // Test 1: Create a test book
  console.log('Test 1: Creating test book...');
  const [testBook] = await db.insert(books).values({
    title: 'Test Lending Book',
    author: 'Test Author',
    ownership: 'owned',
    status: 'available',
    source: 'manual',
  }).returning();
  console.log(`✅ Created book: ${testBook.title} (ID: ${testBook.id})`);

  // Test 2: Loan out the book
  console.log('\nTest 2: Loaning out book...');
  const today = new Date().toISOString().split('T')[0];
  const [loan] = await db.insert(loans).values({
    bookId: testBook.id,
    loanType: 'out',
    personName: 'Sarah Smith',
    personNameNormalized: 'sarah smith',
    loanDate: today,
  }).returning();
  console.log(`✅ Loan created to ${loan.personName}`);

  // Test 3: Update book status
  await db.update(books)
    .set({ status: 'on_loan' })
    .where(eq(books.id, testBook.id));
  console.log('✅ Book status updated to on_loan');

  // Test 4: Get active loans
  console.log('\nTest 3: Getting active loans...');
  const activeLoans = await db.select()
    .from(loans)
    .where(eq(loans.bookId, testBook.id));
  console.log(`✅ Found ${activeLoans.length} active loans`);

  // Test 5: Return the book
  console.log('\nTest 4: Returning book...');
  await db.update(loans)
    .set({ returnDate: today })
    .where(eq(loans.id, loan.id));
  await db.update(books)
    .set({ status: 'available' })
    .where(eq(books.id, testBook.id));
  console.log('✅ Book returned');

  // Test 6: Borrow a book
  console.log('\nTest 5: Adding borrowed book...');
  const [borrowedBook] = await db.insert(books).values({
    title: 'Borrowed Test Book',
    author: 'Another Author',
    ownership: 'borrowed',
    status: 'borrowed',
    borrowedFrom: 'Mike Johnson',
    source: 'manual',
  }).returning();
  console.log(`✅ Borrowed book added from ${borrowedBook.borrowedFrom}`);

  // Test 7: Create loan record for borrowed book
  console.log('\nTest 6: Creating loan record for borrowed book...');
  await db.insert(loans).values({
    bookId: borrowedBook.id,
    loanType: 'in',
    personName: 'Mike Johnson',
    personNameNormalized: 'mike johnson',
    loanDate: today,
  });
  console.log('✅ Loan record created for borrowed book');

  // Test 8: Archive borrowed book
  console.log('\nTest 7: Archiving borrowed book...');
  await db.update(books)
    .set({ archivedAt: new Date().toISOString() })
    .where(eq(books.id, borrowedBook.id));
  console.log('✅ Borrowed book archived');

  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  await db.delete(loans).where(eq(loans.bookId, testBook.id));
  await db.delete(loans).where(eq(loans.bookId, borrowedBook.id));
  await db.delete(books).where(eq(books.id, testBook.id));
  await db.delete(books).where(eq(books.id, borrowedBook.id));
  console.log('✅ Cleanup complete');

  console.log('\n✅ All backend tests passed!');
}

testLendingFeature()
  .then(() => {
    console.log('\n✅ Test suite completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
