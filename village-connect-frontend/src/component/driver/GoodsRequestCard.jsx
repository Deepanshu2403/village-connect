export default function GoodsRequestCard({ goods }) {
  return (
    <div className="goods-card">
      <div>
        <h3>{goods.item}</h3>

        <p>
          {goods.from} → {goods.to}
        </p>

        <span>{goods.weightKg} KG</span>
      </div>

      <div className="goods-actions">
        <button className="accept-btn">
          Accept Delivery
        </button>

        <button className="details-btn">
          Details
        </button>
      </div>
    </div>
  );
}