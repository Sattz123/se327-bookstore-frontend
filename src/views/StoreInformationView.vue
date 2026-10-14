<template>
  <section class="mx-auto max-w-3xl">
    <h1 class="text-3xl font-bold sm:text-4xl">Store information and terms</h1>
    <p class="mt-3 leading-relaxed text-slate-600">
      InwZa Bookstore is a student bookstore demonstration. Browse the catalog, save favorites and
      place demonstration orders using your account.
    </p>
    <div class="mt-8 space-y-7 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
      <section>
        <h2 class="text-xl font-semibold">Your account</h2>
        <p class="mt-2 leading-relaxed text-slate-600">
          Use accurate delivery details and keep your password private. You can update your profile,
          addresses and saved payment methods in your account. Details saved on an existing order
          stay as they were when you placed it.
        </p>
      </section>
      <section>
        <h2 class="text-xl font-semibold">Prices and availability</h2>
        <p class="mt-2 leading-relaxed text-slate-600">
          The cart uses current catalog prices. Adding a book does not reserve stock. Review your
          selected formats, quantities, delivery address and total before placing an order. A
          changed price or unavailable quantity requires another review.
        </p>
      </section>
      <section>
        <h2 class="text-xl font-semibold">Payments and delivery</h2>
        <p class="mt-2 leading-relaxed text-slate-600">
          Checkout offers cash on delivery and simulated card payments. No real card charge is made.
          The displayed total includes the books, with no extra delivery charge in this demo.
          Express delivery, tracking emails and automatic refunds are not provided.
        </p>
      </section>
      <section>
        <h2 class="text-xl font-semibold">Order status and cancellations</h2>
        <p class="mt-2 leading-relaxed text-slate-600">
          Cash-on-delivery orders start as Pending. Simulated card orders start as Completed. An
          administrator can update the status or cancel an order. Cancellation returns its
          quantities to stock; it does not make a money refund. Contact the store with your order
          number if you need help.
        </p>
      </section>
      <section>
        <h2 class="text-xl font-semibold">Returns</h2>
        <p class="mt-2 leading-relaxed text-slate-600">
          The original bookstore describes a 30-day return period for books in their original
          condition. Please contact the store to discuss a return. This demonstration has no online
          return or refund process.
        </p>
      </section>
    </div>
    <nav aria-label="Store help" class="mt-7 flex flex-wrap gap-5">
      <RouterLink :to="{ name: 'faq' }" class="text-indigo-700 underline"
        >Frequently asked questions</RouterLink
      >
      <RouterLink :to="{ name: 'contact' }" class="text-indigo-700 underline"
        >Contact the store</RouterLink
      >
      <RouterLink :to="{ name: 'products' }" class="text-indigo-700 underline"
        >Browse books</RouterLink
      >
    </nav>
  </section>
</template>
